import { eq, desc, ilike, and } from 'drizzle-orm';
import { db } from '../index';
import { 
  optionsTrades, 
  Trade, 
  NewTradeInput, 
  CloseTradeInput, 
  TradeStatus 
} from '../schema';

const DEFAULT_SHARES_PER_CONTRACT = 500;

/**
 * Calculate total premium
 */
function calculateTotalPremium(
  premium: number, 
  contracts: number, 
  sharesPerContract: number
): number {
  return premium * contracts * sharesPerContract;
}

/**
 * Fetch all trades for a user
 */
export async function getTrades(userId: string): Promise<Trade[]> {
  return db
    .select()
    .from(optionsTrades)
    .where(eq(optionsTrades.user_id, userId))
    .orderBy(desc(optionsTrades.trade_date));
}

/**
 * Fetch a single trade by ID
 */
export async function getTradeById(id: string, userId: string): Promise<Trade | undefined> {
  const results = await db
    .select()
    .from(optionsTrades)
    .where(and(eq(optionsTrades.id, id), eq(optionsTrades.user_id, userId)))
    .limit(1);
  
  return results[0];
}

/**
 * Create a new trade
 */
export async function createTrade(userId: string, input: NewTradeInput): Promise<Trade> {
  const sharesPerContract = input.shares_per_contract || DEFAULT_SHARES_PER_CONTRACT;
  
  const results = await db
    .insert(optionsTrades)
    .values({
      user_id: userId,
      stock_symbol: input.stock_symbol.toUpperCase(),
      direction: input.direction,
      strike_price: input.strike_price.toString(),
      expiry_date: input.expiry_date,
      premium: input.premium.toString(),
      contracts: input.contracts,
      shares_per_contract: sharesPerContract,
      fee: (input.fee || 0).toString(),
      stock_price: input.stock_price.toString(),
      hsi: input.hsi.toString(),
      trade_date: input.trade_date ? new Date(input.trade_date) : new Date(),
      status: 'Open',
    })
    .returning();

  return results[0];
}

/**
 * Close a trade position
 */
export async function closeTrade(
  id: string, 
  userId: string, 
  closeData: CloseTradeInput
): Promise<Trade> {
  const results = await db
    .update(optionsTrades)
    .set({
      close_premium: closeData.close_premium.toString(),
      close_fee: (closeData.close_fee || 0).toString(),
      close_stock_price: closeData.close_stock_price?.toString() || null,
      close_hsi: closeData.close_hsi?.toString() || null,
      status: 'Closed',
      updated_at: new Date(),
    })
    .where(and(eq(optionsTrades.id, id), eq(optionsTrades.user_id, userId)))
    .returning();

  return results[0];
}

/**
 * Update trade status
 */
export async function updateTradeStatus(
  id: string, 
  userId: string, 
  status: TradeStatus
): Promise<Trade> {
  const results = await db
    .update(optionsTrades)
    .set({ 
      status, 
      updated_at: new Date() 
    })
    .where(and(eq(optionsTrades.id, id), eq(optionsTrades.user_id, userId)))
    .returning();

  if (!results[0]) {
    throw new Error('Trade not found');
  }

  return results[0];
}

/**
 * Update a trade
 */
export async function updateTrade(
  id: string, 
  userId: string, 
  updates: Partial<Trade>
): Promise<Trade> {
  const results = await db
    .update(optionsTrades)
    .set({
      ...updates,
      updated_at: new Date(),
    })
    .where(and(eq(optionsTrades.id, id), eq(optionsTrades.user_id, userId)))
    .returning();

  if (!results[0]) {
    throw new Error('Trade not found');
  }

  return results[0];
}

/**
 * Delete a trade
 */
export async function deleteTrade(id: string, userId: string): Promise<void> {
  await db
    .delete(optionsTrades)
    .where(and(eq(optionsTrades.id, id), eq(optionsTrades.user_id, userId)));
}

/**
 * Search trades by stock symbol
 */
export async function searchTradesBySymbol(
  userId: string, 
  symbol: string
): Promise<Trade[]> {
  return db
    .select()
    .from(optionsTrades)
    .where(
      and(
        eq(optionsTrades.user_id, userId),
        ilike(optionsTrades.stock_symbol, `%${symbol}%`)
      )
    )
    .orderBy(desc(optionsTrades.trade_date));
}

/**
 * Filter trades by status
 */
export async function filterTradesByStatus(
  userId: string, 
  status: TradeStatus
): Promise<Trade[]> {
  return db
    .select()
    .from(optionsTrades)
    .where(
      and(
        eq(optionsTrades.user_id, userId),
        eq(optionsTrades.status, status)
      )
    )
    .orderBy(desc(optionsTrades.trade_date));
}

/**
 * Get unique stock symbols for user
 */
export async function getUniqueStockSymbols(userId: string): Promise<string[]> {
  const results = await db
    .selectDistinct({ stock_symbol: optionsTrades.stock_symbol })
    .from(optionsTrades)
    .where(eq(optionsTrades.user_id, userId));

  return results.map(r => r.stock_symbol).sort();
}

/**
 * Get trades by stock symbol
 */
export async function getTradesByStock(
  userId: string, 
  symbol: string
): Promise<Trade[]> {
  return db
    .select()
    .from(optionsTrades)
    .where(
      and(
        eq(optionsTrades.user_id, userId),
        eq(optionsTrades.stock_symbol, symbol.toUpperCase())
      )
    )
    .orderBy(desc(optionsTrades.trade_date));
}

/**
 * Get open trades (for expiry checking)
 */
export async function getOpenTrades(userId: string): Promise<Trade[]> {
  return db
    .select()
    .from(optionsTrades)
    .where(
      and(
        eq(optionsTrades.user_id, userId),
        eq(optionsTrades.status, 'Open')
      )
    )
    .orderBy(optionsTrades.expiry_date);
}

/**
 * Batch update trade statuses (for expiry checking)
 */
export async function batchUpdateTradeStatuses(
  userId: string,
  updates: { id: string; status: TradeStatus }[]
): Promise<Trade[]> {
  const promises = updates.map(({ id, status }) =>
    updateTradeStatus(id, userId, status)
  );
  return Promise.all(promises);
}
