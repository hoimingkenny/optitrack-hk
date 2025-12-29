import { Trade, PNLResult, TradeDirection } from '@/db/schema';

// HKEX default shares per contract
export const DEFAULT_SHARES_PER_CONTRACT = 500;

// Helper to parse numeric strings from database
function parseNumeric(value: string | number | null | undefined): number {
  if (value === null || value === undefined) return 0;
  return typeof value === 'string' ? parseFloat(value) : value;
}

/**
 * Calculate total premium for a trade
 */
export function calculateTotalPremium(
  premium: number, 
  contracts: number, 
  sharesPerContract: number = DEFAULT_SHARES_PER_CONTRACT
): number {
  return premium * contracts * sharesPerContract;
}

/**
 * Check if direction is a sell direction
 */
export function isSellDirection(direction: TradeDirection): boolean {
  return direction === 'Sell Put' || direction === 'Sell Call';
}

/**
 * Calculate PNL for a trade
 * For Sell options: PNL = open_total_premium - close_total_premium - fees
 * For Buy options: PNL = close_total_premium - open_total_premium - fees
 */
export function calculateTradePNL(trade: Trade): PNLResult {
  const isSell = isSellDirection(trade.direction);
  const openFee = parseNumeric(trade.fee);
  const closeFee = parseNumeric(trade.close_fee);
  const totalFees = openFee + closeFee;
  const totalPremium = parseNumeric(trade.total_premium);
  
  // If not closed, return zeros
  if (trade.status === 'Open' || trade.close_premium === null || trade.close_premium === undefined) {
    return {
      grossPNL: 0,
      netPNL: 0,
      returnPercentage: 0,
      totalPremiumReceived: isSell ? totalPremium : 0,
      totalPremiumPaid: isSell ? 0 : totalPremium,
      totalFees
    };
  }
  
  const closePremium = parseNumeric(trade.close_premium);
  const closeTotalPremium = calculateTotalPremium(closePremium, trade.contracts, trade.shares_per_contract);
  
  let grossPNL: number;
  let totalPremiumReceived: number;
  let totalPremiumPaid: number;
  
  if (isSell) {
    // Sell: Receive premium at open, pay to close
    grossPNL = totalPremium - closeTotalPremium;
    totalPremiumReceived = totalPremium;
    totalPremiumPaid = closeTotalPremium;
  } else {
    // Buy: Pay premium at open, receive at close
    grossPNL = closeTotalPremium - totalPremium;
    totalPremiumReceived = closeTotalPremium;
    totalPremiumPaid = totalPremium;
  }
  
  const netPNL = grossPNL - totalFees;
  const returnPercentage = totalPremium > 0 
    ? (netPNL / totalPremium) * 100 
    : 0;
  
  return {
    grossPNL,
    netPNL,
    returnPercentage,
    totalPremiumReceived,
    totalPremiumPaid,
    totalFees
  };
}

/**
 * Calculate PNL for expired/exercised/lapsed trades
 */
export function calculateExpiredPNL(trade: Trade): PNLResult {
  const isSell = isSellDirection(trade.direction);
  const totalFees = parseNumeric(trade.fee);
  const totalPremium = parseNumeric(trade.total_premium);
  
  if (trade.status === 'Lapsed') {
    // Option expired worthless
    if (isSell) {
      // Seller keeps full premium
      return {
        grossPNL: totalPremium,
        netPNL: totalPremium - totalFees,
        returnPercentage: 100,
        totalPremiumReceived: totalPremium,
        totalPremiumPaid: 0,
        totalFees
      };
    } else {
      // Buyer loses full premium
      return {
        grossPNL: -totalPremium,
        netPNL: -totalPremium - totalFees,
        returnPercentage: -100,
        totalPremiumReceived: 0,
        totalPremiumPaid: totalPremium,
        totalFees
      };
    }
  }
  
  // For EXERCISED status, PNL depends on assignment details (not calculated here)
  return {
    grossPNL: 0,
    netPNL: 0,
    returnPercentage: 0,
    totalPremiumReceived: isSell ? totalPremium : 0,
    totalPremiumPaid: isSell ? 0 : totalPremium,
    totalFees
  };
}

/**
 * Get final PNL for any trade status
 */
export function getFinalPNL(trade: Trade): PNLResult {
  if (trade.status === 'Closed') {
    return calculateTradePNL(trade);
  }
  if (trade.status === 'Lapsed' || trade.status === 'Exercised') {
    return calculateExpiredPNL(trade);
  }
  // Open or Expired without resolution
  return calculateTradePNL(trade);
}

/**
 * Calculate total portfolio PNL from array of trades
 */
export function calculatePortfolioPNL(trades: Trade[]): number {
  return trades.reduce((total, trade) => {
    const pnl = getFinalPNL(trade);
    return total + pnl.netPNL;
  }, 0);
}

/**
 * Format PNL for display with HKD currency
 */
export function formatPNL(pnl: number): string {
  const sign = pnl >= 0 ? '+' : '';
  return `${sign}HKD ${pnl.toLocaleString('en-HK', { 
    minimumFractionDigits: 2, 
    maximumFractionDigits: 2 
  })}`;
}

/**
 * Format currency for display (HKD)
 */
export function formatHKD(amount: number | string): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  return `HKD ${num.toLocaleString('en-HK', { 
    minimumFractionDigits: 2, 
    maximumFractionDigits: 2 
  })}`;
}

/**
 * Format percentage for display
 */
export function formatPercentage(percentage: number): string {
  const sign = percentage >= 0 ? '+' : '';
  return `${sign}${percentage.toFixed(2)}%`;
}

/**
 * Get PNL color class
 */
export function getPNLColorClass(pnl: number): string {
  if (pnl > 0) return 'text-green-500';
  if (pnl < 0) return 'text-red-500';
  return 'text-gray-500';
}
