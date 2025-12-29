import { pgTable, uuid, text, numeric, integer, timestamp, date } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

// Trade direction enum values
export const tradeDirections = ['Sell Put', 'Sell Call', 'Buy Put', 'Buy Call'] as const;
export type TradeDirection = typeof tradeDirections[number];

// Trade status enum values
export const tradeStatuses = ['Open', 'Closed', 'Expired', 'Exercised', 'Lapsed'] as const;
export type TradeStatus = typeof tradeStatuses[number];

// Options trades table schema - matching actual Supabase database
export const optionsTrades = pgTable('options_trades', {
  id: uuid('id').primaryKey().defaultRandom(),
  user_id: uuid('user_id').notNull(),
  
  // Trade Details
  stock_symbol: text('stock_symbol').notNull(),
  direction: text('direction').notNull().$type<TradeDirection>(),
  strike_price: numeric('strike_price').notNull(),
  expiry_date: date('expiry_date').notNull(),
  
  // Position Details
  premium: numeric('premium').notNull(),
  contracts: integer('contracts').notNull(),
  shares_per_contract: integer('shares_per_contract').notNull().default(500),
  fee: numeric('fee').notNull().default('0'),
  total_premium: numeric('total_premium').generatedAlwaysAs(
    sql`premium * contracts * shares_per_contract`
  ),
  stock_price: numeric('stock_price').notNull(),
  hsi: numeric('hsi').notNull(),
  trade_date: timestamp('trade_date', { withTimezone: true }).notNull().defaultNow(),
  
  // Closing Details (nullable until closed)
  close_premium: numeric('close_premium'),
  close_fee: numeric('close_fee').default('0'),
  close_stock_price: numeric('close_stock_price'),
  close_hsi: numeric('close_hsi'),
  
  // Status
  status: text('status').notNull().default('Open').$type<TradeStatus>(),
  
  // Timestamps
  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

// Inferred types from schema
export type Trade = typeof optionsTrades.$inferSelect;
export type NewTrade = typeof optionsTrades.$inferInsert;

// Input types for API
export interface NewTradeInput {
  stock_symbol: string;
  direction: TradeDirection;
  strike_price: number;
  expiry_date: string;
  premium: number;
  contracts: number;
  shares_per_contract?: number;
  fee?: number;
  stock_price: number;
  hsi: number;
  trade_date?: string;
}

export interface CloseTradeInput {
  close_premium: number;
  close_fee?: number;
  close_stock_price?: number;
  close_hsi?: number;
}

// Additional types for compatibility
export interface TradeFilters {
  stock_symbol?: string;
  status?: TradeStatus | 'ALL';
  direction?: TradeDirection | 'ALL';
  start_date?: string;
  end_date?: string;
}

export interface PNLResult {
  grossPNL: number;
  netPNL: number;
  returnPercentage: number;
  totalPremiumReceived: number;
  totalPremiumPaid: number;
  totalFees: number;
}

export interface StockSummary {
  stock_symbol: string;
  trades: Trade[];
  totalPNL: number;
  winRate: number;
  avgHoldDays: number;
  openCount: number;
  closedCount: number;
  expiredCount: number;
  exercisedCount: number;
  lapsedCount: number;
}

export interface TradeSummary {
  totalTrades: number;
  openTrades: number;
  closedTrades: number;
  totalPNL: number;
  winRate: number;
  avgHoldDays: number;
}

// Generate unique trade ID
export function generateTradeId(
  symbol: string,
  strike: number,
  expiry: string,
  direction: TradeDirection
): string {
  const cleanSymbol = symbol.replace('.HK', '').replace(/\s/g, '');
  const cleanExpiry = expiry.replace(/-/g, '');
  const dirShort = direction.replace(' ', '');
  return `${cleanSymbol}_${strike}_${cleanExpiry}_${dirShort}`;
}
