import { db } from '@/db';
import { trades, options, Trade, NewTrade, CreateTradeInput, UpdateTradeInput } from '@/db/schema';
import { eq, and, desc } from 'drizzle-orm';
import { validateTrade, calculateNetContracts, isClosingTrade } from '@/utils/helpers/option-calculator';

/**
 * Create a new trade for an option
 */
export async function createTrade(
  optionId: string,
  userId: string,
  tradeData: CreateTradeInput
): Promise<{ trade: Trade; shouldCloseOption: boolean }> {
  // Get option and existing trades for validation
  const [option] = await db
    .select()
    .from(options)
    .where(and(eq(options.id, optionId), eq(options.user_id, userId)))
    .limit(1);

  if (!option) {
    throw new Error('Option not found');
  }

  const existingTrades = await db
    .select()
    .from(trades)
    .where(eq(trades.option_id, optionId));

  // Validate the trade
  const validation = validateTrade(option, existingTrades, {
    trade_type: tradeData.trade_type,
    contracts: tradeData.contracts,
  });

  if (!validation.valid) {
    throw new Error(validation.error);
  }

  // Create the trade
  const [newTrade] = await db
    .insert(trades)
    .values({
      option_id: optionId,
      user_id: userId,
      trade_type: tradeData.trade_type,
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

  // Check if position should be closed
  const allTrades = [...existingTrades, newTrade];
  const netContracts = calculateNetContracts(allTrades);
  const shouldCloseOption = netContracts === 0 && isClosingTrade(tradeData.trade_type);

  // Auto-update option status if fully closed
  if (shouldCloseOption) {
    await db
      .update(options)
      .set({
        status: 'Closed',
        updated_at: new Date(),
      })
      .where(eq(options.id, optionId));
  }

  return { trade: newTrade, shouldCloseOption };
}

/**
 * Get all trades for an option
 */
export async function getTradesByOption(optionId: string): Promise<Trade[]> {
  return await db
    .select()
    .from(trades)
    .where(eq(trades.option_id, optionId))
    .orderBy(trades.trade_date);
}

/**
 * Get a single trade by ID
 */
export async function getTradeById(
  tradeId: string,
  userId: string
): Promise<Trade | null> {
  const [trade] = await db
    .select()
    .from(trades)
    .where(and(eq(trades.id, tradeId), eq(trades.user_id, userId)))
    .limit(1);

  return trade || null;
}

/**
 * Update a trade
 */
export async function updateTrade(
  tradeId: string,
  userId: string,
  updates: UpdateTradeInput
): Promise<Trade | null> {
  const updateData: Record<string, unknown> = {
    updated_at: new Date(),
  };

  if (updates.contracts !== undefined) updateData.contracts = updates.contracts;
  if (updates.premium !== undefined) updateData.premium = updates.premium.toString();
  if (updates.fee !== undefined) updateData.fee = updates.fee.toString();
  if (updates.stock_price !== undefined) updateData.stock_price = updates.stock_price.toString();
  if (updates.hsi !== undefined) updateData.hsi = updates.hsi.toString();
  if (updates.trade_date !== undefined) updateData.trade_date = new Date(updates.trade_date);
  if (updates.notes !== undefined) updateData.notes = updates.notes;
  if (updates.margin_percent !== undefined) updateData.margin_percent = updates.margin_percent.toString();

  const [updated] = await db
    .update(trades)
    .set(updateData)
    .where(and(eq(trades.id, tradeId), eq(trades.user_id, userId)))
    .returning();

  return updated || null;
}

/**
 * Delete a trade
 */
export async function deleteTrade(
  tradeId: string,
  userId: string
): Promise<boolean> {
  const result = await db
    .delete(trades)
    .where(and(eq(trades.id, tradeId), eq(trades.user_id, userId)))
    .returning();

  return result.length > 0;
}

/**
 * Get all trades for a user (across all options)
 */
export async function getTradesByUser(userId: string): Promise<Trade[]> {
  return await db
    .select()
    .from(trades)
    .where(eq(trades.user_id, userId))
    .orderBy(desc(trades.trade_date));
}
