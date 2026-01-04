import { db } from '@/db';
import { options, trades, Option, Trade, CreateOptionInput, CreateTradeInput, UpdateOptionInput, OptionWithSummary, OptionWithTrades } from '@/db/schema';
import { eq, and, desc, asc, sql } from 'drizzle-orm';
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
    // 1. Check if option already exists
    const [existingOption] = await tx
      .select()
      .from(options)
      .where(
        and(
          eq(options.user_id, userId),
          eq(options.stock_symbol, optionData.stock_symbol.toUpperCase()),
          eq(options.direction, optionData.direction),
          eq(options.option_type, optionData.option_type),
          eq(options.strike_price, optionData.strike_price.toString()),
          eq(options.expiry_date, optionData.expiry_date)
        )
      )
      .limit(1);

    let optionId: string;
    let finalOption: Option;

    if (existingOption) {
      optionId = existingOption.id;
      finalOption = existingOption;
      
      // If the option was closed, we might want to reopen it if adding a trade.
      // If it's expired, we keep it as expired.
      if (existingOption.status === 'Closed') {
        const [updatedOption] = await tx
          .update(options)
          .set({ status: 'Open', updated_at: new Date() })
          .where(eq(options.id, optionId))
          .returning();
        finalOption = updatedOption;
      }
    } else {
      // Create new option
      const [newOption] = await tx
        .insert(options)
        .values({
          user_id: userId,
          stock_symbol: optionData.stock_symbol.toUpperCase(),
          stock_name: optionData.stock_name || optionData.stock_symbol.toUpperCase(),
          direction: optionData.direction,
          option_type: optionData.option_type,
          strike_price: optionData.strike_price.toString(),
          expiry_date: optionData.expiry_date,
          futu_code: optionData.futu_code,
          status: optionData.status || 'Open',
        })
        .returning();
      optionId = newOption.id;
      finalOption = newOption;
    }

    // 2. Create the trade (If it's an existing option, we use ADD, if new we use OPEN)
    const [newTrade] = await tx
      .insert(trades)
      .values({
        option_id: optionId,
        user_id: userId,
        trade_type: optionData.direction === 'Sell' ? 'OPEN_SELL' : 'OPEN_BUY',
        contracts: tradeData.contracts,
        premium: tradeData.premium.toString(),
        shares_per_contract: tradeData.shares_per_contract ?? 500,
        fee: tradeData.fee?.toString() ?? '0',
        stock_price: tradeData.stock_price.toString(),
        hsi: tradeData.hsi.toString(),
        trade_date: tradeData.trade_date ? new Date(tradeData.trade_date) : new Date(),
        notes: tradeData.notes,
        margin_percent: tradeData.margin_percent?.toString(),
      })
      .returning();

    return { option: finalOption, trade: newTrade };
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
      trades: sql<Trade[]>`json_agg(${trades}.* ORDER BY ${trades.trade_date} ASC, ${trades.created_at} ASC)`.as('trades'),
    })
    .from(options)
    .leftJoin(trades, eq(trades.option_id, options.id))
    .where(eq(options.user_id, userId))
    .groupBy(options.id)
    .orderBy(
      sql`CASE WHEN ${options.status} = 'Open' THEN 0 ELSE 1 END`,
      asc(options.expiry_date),
      asc(options.stock_symbol)
    );

  return result.map((row) => {
    const tradesData: Trade[] = Array.isArray(row.trades) 
      ? row.trades.filter((t: Trade | null) => t !== null && t.id != null) 
      : [];
    const pnl = calculateOptionPNL({ ...row.option } as any, tradesData);
    const netContracts = calculateNetContracts(tradesData);

    return {
      ...row.option,
      total_contracts: pnl.totalOpened,
      net_contracts: netContracts,
      total_pnl: pnl.netPNL,
      trades_count: tradesData.length,
      shares_per_contract: tradesData[0]?.shares_per_contract || 500,
    };
  });
}

/**
 * Get all open options for a user with trades (for PNL calculation)
 */
export async function getOpenOptionsWithTrades(
  userId: string
): Promise<OptionWithTrades[]> {
  const result = await db
    .select({
      option: options,
      trades: sql<Trade[]>`json_agg(${trades}.* ORDER BY ${trades.trade_date} ASC, ${trades.created_at} ASC)`.as('trades'),
    })
    .from(options)
    .leftJoin(trades, eq(trades.option_id, options.id))
    .where(and(eq(options.user_id, userId), eq(options.status, 'Open')))
    .groupBy(options.id);

  return result.map((row) => {
    const tradesData: Trade[] = Array.isArray(row.trades) 
      ? row.trades.filter((t: Trade | null) => t !== null && t.id != null) 
      : [];
    const summary = calculateOptionPNL({ ...row.option } as any, tradesData);

    return {
      ...row.option,
      trades: tradesData,
      summary,
    };
  });
}

/**
 * Get all options for a user with trades
 */
export async function getAllOptionsWithTrades(
  userId: string
): Promise<OptionWithTrades[]> {
  const result = await db
    .select({
      option: options,
      trades: sql<Trade[]>`json_agg(${trades}.* ORDER BY ${trades.trade_date} ASC, ${trades.created_at} ASC)`.as('trades'),
    })
    .from(options)
    .leftJoin(trades, eq(trades.option_id, options.id))
    .where(eq(options.user_id, userId))
    .groupBy(options.id)
    .orderBy(
      sql`CASE WHEN ${options.status} = 'Open' THEN 0 ELSE 1 END`,
      asc(options.expiry_date),
      asc(options.stock_symbol)
    );

  return result.map((row) => {
    const tradesData: Trade[] = Array.isArray(row.trades) 
      ? row.trades.filter((t: Trade | null) => t !== null && t.id != null) 
      : [];
    const summary = calculateOptionPNL({ ...row.option } as any, tradesData);

    return {
      ...row.option,
      trades: tradesData,
      summary,
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
    .orderBy(trades.trade_date, trades.created_at);

  const summary = calculateOptionPNL({ ...option } as any, optionTrades);

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
        eq(options.stock_symbol, stockSymbol.toUpperCase()),
        sql`${options.direction} = ${direction}`,
        eq(options.strike_price, strikePrice.toString()),
        eq(options.expiry_date, expiryDate)
      )
    )
    .limit(1);

  return option || null;
}
