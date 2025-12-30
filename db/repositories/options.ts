import { db } from '@/db';
import { options, trades, Option, NewOption, Trade, CreateOptionInput, CreateTradeInput, UpdateOptionInput, OptionWithSummary, OptionWithTrades, TradeDirection } from '@/db/schema';
import { eq, and, desc, sql } from 'drizzle-orm';
import { calculateOptionPNL, calculateNetContracts } from '@/utils/helpers/option-calculator';

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
    // Create the option
    const [newOption] = await tx
      .insert(options)
      .values({
        user_id: userId,
        stock_symbol: optionData.stock_symbol,
        direction: optionData.direction,
        strike_price: optionData.strike_price.toString(),
        expiry_date: optionData.expiry_date,
        status: 'Open',
      })
      .returning();

    // Create the initial trade (always OPEN)
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
      trades: sql<Trade[]>`json_agg(${trades}.*)`.as('trades'),
    })
    .from(options)
    .leftJoin(trades, eq(trades.option_id, options.id))
    .where(eq(options.user_id, userId))
    .groupBy(options.id)
    .orderBy(desc(options.created_at));

  return result.map((row) => {
    const tradesData: Trade[] = Array.isArray(row.trades) 
      ? row.trades.filter((t: Trade | null) => t !== null) 
      : [];
    const pnl = calculateOptionPNL(row.option, tradesData);
    const netContracts = calculateNetContracts(tradesData);

    return {
      ...row.option,
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
  const [option] = await db
    .select()
    .from(options)
    .where(and(eq(options.id, optionId), eq(options.user_id, userId)))
    .limit(1);

  if (!option) return null;

  const optionTrades = await db
    .select()
    .from(trades)
    .where(eq(trades.option_id, optionId))
    .orderBy(trades.trade_date);

  const summary = calculateOptionPNL(option, optionTrades);

  return {
    ...option,
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
  const [option] = await db
    .select()
    .from(options)
    .where(
      and(
        eq(options.user_id, userId),
        eq(options.stock_symbol, stockSymbol),
        sql`${options.direction} = ${direction}`,
        eq(options.strike_price, strikePrice.toString()),
        eq(options.expiry_date, expiryDate)
      )
    )
    .limit(1);

  return option || null;
}
