import { Trade, Option, OptionPNL, TradeDirection } from '@/db/schema';

// HKEX default shares per contract
export const DEFAULT_SHARES_PER_CONTRACT = 500;

// Helper to parse numeric strings from database
function parseNumeric(value: string | number | null | undefined): number {
  if (value === null || value === undefined) return 0;
  return typeof value === 'string' ? parseFloat(value) : value;
}

/**
 * Check if direction is a sell direction
 */
export function isSellDirection(direction: TradeDirection): boolean {
  return direction === 'Sell Put' || direction === 'Sell Call';
}

/**
 * Calculate net contracts from all trades
 * OPEN and ADD increase position, REDUCE and CLOSE decrease position
 */
export function calculateNetContracts(trades: Trade[]): number {
  return trades.reduce((total, trade) => {
    const contracts = parseNumeric(trade.contracts);
    if (trade.trade_type === 'OPEN' || trade.trade_type === 'ADD') {
      return total + contracts;
    } else if (trade.trade_type === 'REDUCE' || trade.trade_type === 'CLOSE') {
      return total - contracts;
    }
    return total;
  }, 0);
}

/**
 * Calculate total contracts opened (OPEN + ADD)
 */
export function calculateTotalOpened(trades: Trade[]): number {
  return trades
    .filter(t => t.trade_type === 'OPEN' || t.trade_type === 'ADD')
    .reduce((sum, trade) => sum + parseNumeric(trade.contracts), 0);
}

/**
 * Calculate total contracts closed (REDUCE + CLOSE)
 */
export function calculateTotalClosed(trades: Trade[]): number {
  return trades
    .filter(t => t.trade_type === 'REDUCE' || t.trade_type === 'CLOSE')
    .reduce((sum, trade) => sum + parseNumeric(trade.contracts), 0);
}

/**
 * Calculate average entry premium (weighted by contracts)
 */
export function calculateAverageEntryPremium(trades: Trade[]): number {
  const openTrades = trades.filter(t => 
    t.trade_type === 'OPEN' || t.trade_type === 'ADD'
  );
  
  const totalPremiumPaid = openTrades.reduce((sum, trade) => {
    const premium = parseNumeric(trade.premium);
    const contracts = parseNumeric(trade.contracts);
    return sum + (premium * contracts);
  }, 0);
  
  const totalContracts = openTrades.reduce((sum, trade) => 
    sum + parseNumeric(trade.contracts), 0
  );
  
  return totalContracts > 0 ? totalPremiumPaid / totalContracts : 0;
}

/**
 * Calculate average exit premium (weighted by contracts)
 */
export function calculateAverageExitPremium(trades: Trade[]): number {
  const closeTrades = trades.filter(t => 
    t.trade_type === 'REDUCE' || t.trade_type === 'CLOSE'
  );
  
  const totalPremiumReceived = closeTrades.reduce((sum, trade) => {
    const premium = parseNumeric(trade.premium);
    const contracts = parseNumeric(trade.contracts);
    return sum + (premium * contracts);
  }, 0);
  
  const totalContracts = closeTrades.reduce((sum, trade) => 
    sum + parseNumeric(trade.contracts), 0
  );
  
  return totalContracts > 0 ? totalPremiumReceived / totalContracts : 0;
}

/**
 * Calculate total fees across all trades
 */
export function calculateTotalFees(trades: Trade[]): number {
  return trades.reduce((sum, trade) => 
    sum + parseNumeric(trade.fee), 0
  );
}

/**
 * Calculate realized PNL from closed contracts
 * For Sell options: PNL = (entry premium - exit premium) * contracts * shares
 * For Buy options: PNL = (exit premium - entry premium) * contracts * shares
 */
export function calculateRealizedPNL(
  option: Option,
  trades: Trade[]
): number {
  const isSell = isSellDirection(option.direction);
  const closedContracts = calculateTotalClosed(trades);
  
  if (closedContracts === 0) return 0;
  
  const avgEntry = calculateAverageEntryPremium(trades);
  const avgExit = calculateAverageExitPremium(trades);
  
  let pnl: number;
  if (isSell) {
    // Seller: Receive premium at open, pay to close
    pnl = (avgEntry - avgExit) * closedContracts * DEFAULT_SHARES_PER_CONTRACT;
  } else {
    // Buyer: Pay premium at open, receive at close
    pnl = (avgExit - avgEntry) * closedContracts * DEFAULT_SHARES_PER_CONTRACT;
  }
  
  return pnl;
}

/**
 * Calculate unrealized PNL for open contracts
 * Returns 0 for now (would need current market price)
 */
export function calculateUnrealizedPNL(
  option: Option,
  trades: Trade[]
): number {
  const netContracts = calculateNetContracts(trades);
  if (netContracts === 0) return 0;
  
  // TODO: Calculate based on current market price
  // For now, return 0 for open positions
  return 0;
}

/**
 * Calculate complete PNL summary for an option
 */
export function calculateOptionPNL(
  option: Option,
  trades: Trade[]
): OptionPNL {
  const totalOpened = calculateTotalOpened(trades);
  const totalClosed = calculateTotalClosed(trades);
  const netContracts = calculateNetContracts(trades);
  const avgEntryPremium = calculateAverageEntryPremium(trades);
  const avgExitPremium = calculateAverageExitPremium(trades);
  const totalFees = calculateTotalFees(trades);
  const realizedPNL = calculateRealizedPNL(option, trades);
  const unrealizedPNL = calculateUnrealizedPNL(option, trades);
  const grossPNL = realizedPNL + unrealizedPNL;
  const netPNL = grossPNL - totalFees;
  
  // Calculate return percentage based on total premium invested
  const totalInvested = avgEntryPremium * totalOpened * DEFAULT_SHARES_PER_CONTRACT;
  const returnPercentage = totalInvested > 0 ? (netPNL / totalInvested) * 100 : 0;
  
  return {
    totalOpened,
    totalClosed,
    netContracts,
    avgEntryPremium,
    avgExitPremium,
    totalFees,
    realizedPNL,
    unrealizedPNL,
    grossPNL,
    netPNL,
    returnPercentage,
  };
}

/**
 * Format option description (for display)
 */
export function formatOptionDescription(option: Option): string {
  const strike = parseNumeric(option.strike_price);
  return `${option.stock_symbol} ${option.direction} HKD ${strike.toFixed(2)}`;
}

/**
 * Check if option should be marked as expired
 */
export function isOptionExpired(option: Option): boolean {
  const expiryDate = new Date(option.expiry_date);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return expiryDate < today && option.status === 'Open';
}

/**
 * Validate trade against current position
 */
export function validateTrade(
  option: Option,
  trades: Trade[],
  newTrade: { trade_type: string; contracts: number }
): { valid: boolean; error?: string } {
  const netContracts = calculateNetContracts(trades);
  
  // OPEN can only be used if no trades exist
  if (newTrade.trade_type === 'OPEN' && trades.length > 0) {
    return { valid: false, error: 'Cannot OPEN - position already exists' };
  }
  
  // ADD, REDUCE, CLOSE require existing position
  if (newTrade.trade_type !== 'OPEN' && trades.length === 0) {
    return { valid: false, error: 'Cannot add trade - no position exists' };
  }
  
  // REDUCE and CLOSE cannot exceed current position
  if (newTrade.trade_type === 'REDUCE' || newTrade.trade_type === 'CLOSE') {
    if (newTrade.contracts > netContracts) {
      return { 
        valid: false, 
        error: `Cannot close ${newTrade.contracts} contracts - only ${netContracts} open` 
      };
    }
  }
  
  // CLOSE must close entire position
  if (newTrade.trade_type === 'CLOSE' && newTrade.contracts !== netContracts) {
    return { 
      valid: false, 
      error: `CLOSE must close all ${netContracts} contracts` 
    };
  }
  
  // Cannot add trades to closed position
  if (option.status === 'Closed') {
    return { valid: false, error: 'Cannot add trades to closed position' };
  }
  
  return { valid: true };
}
