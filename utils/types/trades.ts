// Trade type definitions for OptiTrack HK

export type TradeDirection = 'Buy' | 'Sell';
export type OptionType = 'Call' | 'Put';

export type TradeStatus = 
  | 'Open' 
  | 'Closed' 
  | 'Expired'
  | 'Exercised' 
  | 'Lapsed';

export interface Trade {
  id: string; // UUID auto-generated
  user_id: string;
  
  // Trade Details
  stock_symbol: string; // e.g., "0369.HK"
  direction: TradeDirection;
  option_type: OptionType;
  strike_price: number;
  expiry_date: string; // YYYY-MM-DD
  
  // Position Details
  premium: number; // HKD per share
  contracts: number;
  shares_per_contract: number; // Default 500 for HKEX
  total_premium: number; // Computed: premium * contracts * shares_per_contract
  fee: number; // Opening fee, default 0
  stock_price: number; // Stock price at open (required)
  hsi: number; // HSI at open (required)
  trade_date: string; // ISO timestamp, auto now
  margin_percent?: string | null;

  // Closing Details (nullable until closed)
  close_premium?: number | null;
  close_fee?: number | null;
  close_stock_price?: number | null;
  close_hsi?: number | null;
  
  // Status
  status: TradeStatus; // Default "Open"
  
  // Timestamps
  created_at: string;
  updated_at: string;
}

export interface NewTradeInput {
  stock_symbol: string;
  direction: TradeDirection;
  option_type: OptionType;
  strike_price: number;
  expiry_date: string;
  premium: number;
  contracts: number;
  shares_per_contract?: number; // Default 500
  fee?: number;
  stock_price: number; // Required
  hsi: number; // Required
  trade_date?: string;
  margin_percent?: number;
}

export interface CloseTradeInput {
  close_premium: number;
  close_fee?: number;
  close_stock_price?: number;
  close_hsi?: number;
  closing_date?: string;
}

export interface PNLResult {
  grossPNL: number;
  netPNL: number;
  returnPercentage: number;
  totalPremiumReceived: number;
  totalPremiumPaid: number;
  totalFees: number;
}

export interface TradeFilters {
  stock_symbol?: string;
  status?: TradeStatus | 'ALL';
  direction?: TradeDirection | 'ALL';
  start_date?: string;
  end_date?: string;
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

// Generate unique trade ID: SYMBOL_STRIKE_EXPIRY_DIRECTION
export function generateTradeId(
  symbol: string, 
  strike: number, 
  expiry: string, 
  direction: TradeDirection
): string {
  const cleanSymbol = symbol.replace('.HK', '').replace(/\s/g, '');
  const cleanExpiry = expiry.replace(/-/g, '');
  const dirShort = direction.replace('_', '');
  return `${cleanSymbol}_${strike}_${cleanExpiry}_${dirShort}`;
}
