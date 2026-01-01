import { db } from '@/db';
import { options, trades, stocks, Option, NewOption, Trade, CreateOptionInput, CreateTradeInput, UpdateOptionInput, OptionWithSummary, OptionWithTrades, TradeDirection } from '@/db/schema';
import { eq, and, desc, sql } from 'drizzle-orm';
import { calculateOptionPNL, calculateNetContracts } from '@/utils/helpers/option-calculator';
import { createStock, getStockBySymbol } from './stocks';

/**
 * Create a new option with an initial trade
 */
export async function createOptionWithTrade(
  userId: string,
  optionData: CreateOptionInput,
  tradeData: Omit<CreateTradeInput, 'trade_type'>
): Promise<{ option: Option; trade: Trade }> {
  // Start transaction
  const result = await db.transaction(async (tx) => {
    // 1. Find or create stock
    let stockId: string;
    const existingStock = await tx
      .select()
      .from(stocks)
      .where(eq(stocks.symbol, optionData.stock_symbol.toUpperCase()))
      .limit(1);

    if (existingStock.length > 0) {
      stockId = existingStock[0].id;
    } else {
      const [newStock] = await tx
        .insert(stocks)
        .values({
          name: optionData.stock_symbol.toUpperCase(),
          symbol: optionData.stock_symbol.toUpperCase(),
          shares_per_contract: 500, // Default
        })
        .returning();
      stockId = newStock.id;
    }

    // 2. Create the option
    const [newOption] = await tx
      .insert(options)
      .values({
        user_id: userId,
        stock_id: stockId,
        direction: optionData.direction,
        strike_price: optionData.strike_price.toString(),
        expiry_date: optionData.expiry_date,
        status: 'Open',
      })
      .returning();

    // 3. Create the initial trade (always OPEN)
    const [newTrade] = await tx
      .insert(trades)
      .values({
        option_id: newOption.id,
        user_id: userId,
        trade_type: 'OPEN',
        contracts: tradeData.contracts,
        premium: tradeData.premium.toString(),
        fee: tradeData.fee?.toString() ?? '0',
        stock_price: tradeData.stock_price.toString(),
        hsi: tradeData.hsi.toString(),
        trade_date: tradeData.trade_date ? new Date(tradeData.trade_date) : new Date(),
        notes: tradeData.notes,
      })
      .returning();

    return { option: newOption, trade: newTrade };
  });

  return result;
}

/**
 * Get all options for a user with aggregated summary
 */
export async function getOptionsWithSummary(
  userId: string
): Promise<OptionWithSummary[]> {
  const result = await db
    .select({
      option: options,
      stockSymbol: stocks.symbol,
      trades: sql<Trade[]>`json_agg(${trades}.*)`.as('trades'),
    })
    .from(options)
    .innerJoin(stocks, eq(options.stock_id, stocks.id))
    .leftJoin(trades, eq(trades.option_id, options.id))
    .where(eq(options.user_id, userId))
    .groupBy(options.id, stocks.symbol)
    .orderBy(desc(options.created_at));

  return result.map((row) => {
    const tradesData: Trade[] = Array.isArray(row.trades) 
      ? row.trades.filter((t: Trade | null) => t !== null) 
      : [];
    const pnl = calculateOptionPNL({ ...row.option, stock_symbol: row.stockSymbol } as any, tradesData);
    const netContracts = calculateNetContracts(tradesData);

    return {
      ...row.option,
      stock_symbol: row.stockSymbol,
      total_contracts: pnl.totalOpened,
      net_contracts: netContracts,
      total_pnl: pnl.netPNL,
      trades_count: tradesData.length,
    };
  });
}

/**
 * Get a single option by ID with all trades and summary
 */
export async function getOptionById(
  optionId: string,
  userId: string
): Promise<OptionWithTrades | null> {
  const [row] = await db
    .select({
      option: options,
      stockSymbol: stocks.symbol,
    })
    .from(options)
    .innerJoin(stocks, eq(options.stock_id, stocks.id))
    .where(and(eq(options.id, optionId), eq(options.user_id, userId)))
    .limit(1);

  if (!row) return null;

  const optionTrades = await db
    .select()
    .from(trades)
    .where(eq(trades.option_id, optionId))
    .orderBy(trades.trade_date);

  const summary = calculateOptionPNL({ ...row.option, stock_symbol: row.stockSymbol } as any, optionTrades);

  return {
    ...row.option,
    stock_symbol: row.stockSymbol,
    trades: optionTrades,
    summary,
  };
}

/**
 * Update option status
 */
export async function updateOptionStatus(
  optionId: string,
  userId: string,
  updates: UpdateOptionInput
): Promise<Option | null> {
  const [updated] = await db
    .update(options)
    .set({
      ...updates,
      updated_at: new Date(),
    })
    .where(and(eq(options.id, optionId), eq(options.user_id, userId)))
    .returning();

  return updated || null;
}

/**
 * Delete an option (cascade deletes all trades)
 */
export async function deleteOption(
  optionId: string,
  userId: string
): Promise<boolean> {
  const result = await db
    .delete(options)
    .where(and(eq(options.id, optionId), eq(options.user_id, userId)))
    .returning();

  return result.length > 0;
}

/**
 * Check for expired options and update status
 */
export async function updateExpiredOptions(userId: string): Promise<number> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const result = await db
    .update(options)
    .set({
      status: 'Expired',
      updated_at: new Date(),
    })
    .where(
      and(
        eq(options.user_id, userId),
        eq(options.status, 'Open'),
        sql`${options.expiry_date} < ${today.toISOString().split('T')[0]}`
      )
    )
    .returning();

  return result.length;
}

/**
 * Find option by contract details (for checking duplicates)
 */
export async function findOptionByContract(
  userId: string,
  stockSymbol: string,
  direction: string,
  strikePrice: number,
  expiryDate: string
): Promise<Option | null> {
  // First get stock ID
  const stock = await getStockBySymbol(stockSymbol);
  if (!stock) return null;

  const [option] = await db
    .select()
    .from(options)
    .where(
      and(
        eq(options.user_id, userId),
        eq(options.stock_id, stock.id),
        sql`${options.direction} = ${direction}`,
        eq(options.strike_price, strikePrice.toString()),
        eq(options.expiry_date, expiryDate)
      )
    )
    .limit(1);

  return option || null;
}
