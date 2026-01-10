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
export const tradeTypes = ['OPEN_SELL', 'CLOSE_BUY', 'OPEN_BUY', 'CLOSE_SELL'] as const;
export type TradeType = typeof tradeTypes[number];

// ============================================================================
// Options Table (Parent)
// ============================================================================

export const options = pgTable('options', {
  id: uuid('id').primaryKey().defaultRandom(),
  user_id: uuid('user_id').notNull(),
  
  // Option Contract Details
  stock_symbol: text('stock_symbol').notNull(),
  stock_name: text('stock_name').notNull(),
  direction: text('direction').notNull().$type<TradeDirection>(),
  option_type: text('option_type').notNull().$type<OptionType>(),
  strike_price: numeric('strike_price').notNull(),
  expiry_date: date('expiry_date').notNull(),
  futu_code: text('futu_code'), // Full Futu option code for price snapshots
  
  // Position Status
  status: text('status').notNull().default('Open').$type<TradeStatus>(),
  
  // Metadata
  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  // Ensure unique option per user
  uniqueOptionPerUser: unique('unique_option_per_user').on(
    table.user_id,
    table.stock_symbol,
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
  
  // Margin
  margin_percent: numeric('margin_percent'), // Optional margin percentage (e.g., 20 for 20%)

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
export interface Stock {
  id: string;
  symbol: string;
  short_name: string;
  market: string;
  status: 'active' | 'inactive';
  shares_per_contract: number;
  created_at: Date;
  updated_at: Date;
}

// ============================================================================
// Input Types for API
// ============================================================================

export interface CreateOptionInput {
  stock_symbol: string;
  stock_name?: string;
  direction: TradeDirection;
  option_type: OptionType;
  strike_price: number;
  expiry_date: string;
  futu_code?: string;
  status?: TradeStatus;
}

export interface CreateTradeInput {
  trade_type: TradeType;
  contracts: number;
  premium: number;
  shares_per_contract?: number;
  fee?: number;
  stock_price: number;
  hsi: number;
  margin_percent?: number;
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
  margin_percent?: number;
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
  totalPremium: number;
  roc?: number;
  rocMargin?: number;
  dte?: number;
  totalMargin?: number;
  marketValue?: number;
}

export interface OptionWithSummary extends Option {
  total_contracts: number;
  net_contracts: number;
  total_pnl: number;
  unrealized_pnl?: number;
  trades_count: number;
  shares_per_contract?: number;
}

export interface OptionWithTrades extends Option {
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
