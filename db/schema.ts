import { pgTable, uuid, text, numeric, integer, timestamp, date, unique } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

// Trade direction enum values
export const tradeDirections = ['Buy', 'Sell'] as const;
export type TradeDirection = typeof tradeDirections[number];

// Option type enum values
export const optionTypes = ['Call', 'Put'] as const;
export type OptionType = typeof optionTypes[number];

// Trade status enum values
export const tradeStatuses = ['Open', 'Closed', 'Expired', 'Exercised', 'Lapsed'] as const;
export type TradeStatus = typeof tradeStatuses[number];

// Trade type enum values
export const tradeTypes = ['OPEN', 'ADD', 'REDUCE', 'CLOSE'] as const;
export type TradeType = typeof tradeTypes[number];

// ============================================================================
// Stocks Table
// ============================================================================

export const stocks = pgTable('stocks', {
  id: uuid('id').primaryKey().defaultRandom(),
  
  // Stock Information
  name: text('name').notNull(),
  symbol: text('symbol').notNull().unique(),
  shares_per_contract: integer('shares_per_contract').notNull().default(500),
  
  // Metadata
  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

// ============================================================================
// Options Table (Parent)
// ============================================================================

export const options = pgTable('options', {
  id: uuid('id').primaryKey().defaultRandom(),
  user_id: uuid('user_id').notNull(),
  
  // Option Contract Details
  stock_id: uuid('stock_id').notNull().references(() => stocks.id, { onDelete: 'restrict' }),
  direction: text('direction').notNull().$type<TradeDirection>(),
  option_type: text('option_type').notNull().$type<OptionType>(),
  strike_price: numeric('strike_price').notNull(),
  expiry_date: date('expiry_date').notNull(),
  
  // Position Status
  status: text('status').notNull().default('Open').$type<TradeStatus>(),
  
  // Metadata
  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  // Ensure unique option per user
  uniqueOptionPerUser: unique('unique_option_per_user').on(
    table.user_id,
    table.stock_id,
    table.direction,
    table.option_type,
    table.strike_price,
    table.expiry_date
  ),
}));

// ============================================================================
// Trades Table (Child)
// ============================================================================

export const trades = pgTable('trades', {
  id: uuid('id').primaryKey().defaultRandom(),
  option_id: uuid('option_id').notNull().references(() => options.id, { onDelete: 'cascade' }),
  user_id: uuid('user_id').notNull(),
  
  // Trade Details
  trade_type: text('trade_type').notNull().$type<TradeType>(),
  trade_date: timestamp('trade_date', { withTimezone: true }).notNull().defaultNow(),
  
  // Position Details
  contracts: integer('contracts').notNull(),
  premium: numeric('premium').notNull(),
  shares_per_contract: integer('shares_per_contract').notNull().default(500),
  fee: numeric('fee').notNull().default('0'),
  
  // Market Context
  stock_price: numeric('stock_price').notNull(),
  hsi: numeric('hsi').notNull(),
  
  // Optional
  notes: text('notes'),
  
  // Metadata
  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

// ============================================================================
// Inferred Types
// ============================================================================

export type Option = typeof options.$inferSelect;
export type NewOption = typeof options.$inferInsert;
export type Trade = typeof trades.$inferSelect;
export type NewTrade = typeof trades.$inferInsert;
export type Stock = typeof stocks.$inferSelect;
export type NewStock = typeof stocks.$inferInsert;

// ============================================================================
// Input Types for API
// ============================================================================

export interface CreateStockInput {
  name: string;
  symbol: string;
  shares_per_contract?: number;
}

export interface UpdateStockInput {
  name?: string;
  shares_per_contract?: number;
}

export interface CreateOptionInput {
  stock_symbol: string;
  direction: TradeDirection;
  option_type: OptionType;
  strike_price: number;
  expiry_date: string;
}

export interface CreateTradeInput {
  trade_type: TradeType;
  contracts: number;
  premium: number;
  shares_per_contract?: number;
  fee?: number;
  stock_price: number;
  hsi: number;
  trade_date?: string;
  notes?: string;
}

export interface CreateOptionWithTradeInput {
  option: CreateOptionInput;
  trade: Omit<CreateTradeInput, 'trade_type'> & { trade_type?: 'OPEN' };
}

export interface UpdateOptionInput {
  status?: TradeStatus;
}

export interface UpdateTradeInput {
  contracts?: number;
  premium?: number;
  fee?: number;
  stock_price?: number;
  hsi?: number;
  trade_date?: string;
  notes?: string;
}

// ============================================================================
// Filter & Summary Types
// ============================================================================

export interface OptionFilters {
  stock_symbol?: string;
  status?: TradeStatus | 'ALL';
  direction?: TradeDirection | 'ALL';
  option_type?: OptionType | 'ALL';
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

export interface OptionPNL {
  totalOpened: number;
  totalClosed: number;
  netContracts: number;
  avgEntryPremium: number;
  avgExitPremium: number;
  totalFees: number;
  realizedPNL: number;
  unrealizedPNL: number;
  grossPNL: number;
  netPNL: number;
  returnPercentage: number;
}

export interface OptionWithSummary extends Option {
  stock_symbol: string;
  total_contracts: number;
  net_contracts: number;
  total_pnl: number;
  trades_count: number;
}

export interface OptionWithTrades extends Option {
  stock_symbol: string;
  trades: Trade[];
  summary: OptionPNL;
}

// ============================================================================
// Helper Functions
// ============================================================================

// Generate unique option ID
export function generateOptionId(
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
