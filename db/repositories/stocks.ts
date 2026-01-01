import { db } from '@/db';
import { stocks, Stock, NewStock, CreateStockInput, UpdateStockInput } from '@/db/schema';
import { eq, ilike } from 'drizzle-orm';

/**
 * Create a new stock
 */
export async function createStock(data: CreateStockInput): Promise<Stock> {
  const [newStock] = await db
    .insert(stocks)
    .values({
      name: data.name,
      symbol: data.symbol.toUpperCase(),
      shares_per_contract: data.shares_per_contract ?? 500,
    })
    .returning();

  return newStock;
}

/**
 * Get all stocks
 */
export async function getAllStocks(): Promise<Stock[]> {
  return await db
    .select()
    .from(stocks)
    .orderBy(stocks.symbol);
}

/**
 * Get stock by symbol
 */
export async function getStockBySymbol(symbol: string): Promise<Stock | null> {
  const [stock] = await db
    .select()
    .from(stocks)
    .where(eq(stocks.symbol, symbol.toUpperCase()))
    .limit(1);

  return stock || null;
}

/**
 * Get stock by ID
 */
export async function getStockById(id: string): Promise<Stock | null> {
  const [stock] = await db
    .select()
    .from(stocks)
    .where(eq(stocks.id, id))
    .limit(1);

  return stock || null;
}

/**
 * Update stock information
 */
export async function updateStock(
  id: string,
  updates: UpdateStockInput
): Promise<Stock | null> {
  const [updated] = await db
    .update(stocks)
    .set({
      ...updates,
      updated_at: new Date(),
    })
    .where(eq(stocks.id, id))
    .returning();

  return updated || null;
}

/**
 * Delete a stock
 */
export async function deleteStock(id: string): Promise<boolean> {
  const result = await db
    .delete(stocks)
    .where(eq(stocks.id, id))
    .returning();

  return result.length > 0;
}

/**
 * Search stocks by name or symbol
 */
export async function searchStocks(query: string): Promise<Stock[]> {
  return await db
    .select()
    .from(stocks)
    .where(ilike(stocks.symbol, `%${query}%`))
    .orderBy(stocks.symbol);
}
