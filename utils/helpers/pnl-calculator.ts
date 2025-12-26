import { Trade, PNLResult, TradeDirection } from '../types/trades';

// HKEX default shares per contract
export const DEFAULT_SHARES_PER_CONTRACT = 500;

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
  const openFee = trade.fee || 0;
  const closeFee = trade.close_fee || 0;
  const totalFees = openFee + closeFee;
  
  // If not closed, return zeros
  if (trade.status === 'Open' || trade.close_premium === null || trade.close_premium === undefined) {
    return {
      grossPNL: 0,
      netPNL: 0,
      returnPercentage: 0,
      totalPremiumReceived: isSell ? trade.total_premium : 0,
      totalPremiumPaid: isSell ? 0 : trade.total_premium,
      totalFees
    };
  }
  
  const closeTotalPremium = calculateTotalPremium(trade.close_premium, trade.contracts, trade.shares_per_contract);
  
  let grossPNL: number;
  let totalPremiumReceived: number;
  let totalPremiumPaid: number;
  
  if (isSell) {
    // Sell: Receive premium at open, pay to close
    grossPNL = trade.total_premium - closeTotalPremium;
    totalPremiumReceived = trade.total_premium;
    totalPremiumPaid = closeTotalPremium;
  } else {
    // Buy: Pay premium at open, receive at close
    grossPNL = closeTotalPremium - trade.total_premium;
    totalPremiumReceived = closeTotalPremium;
    totalPremiumPaid = trade.total_premium;
  }
  
  const netPNL = grossPNL - totalFees;
  const returnPercentage = trade.total_premium > 0 
    ? (netPNL / trade.total_premium) * 100 
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
  const totalFees = trade.fee || 0;
  
  if (trade.status === 'Lapsed') {
    // Option expired worthless
    if (isSell) {
      // Seller keeps full premium
      return {
        grossPNL: trade.total_premium,
        netPNL: trade.total_premium - totalFees,
        returnPercentage: 100,
        totalPremiumReceived: trade.total_premium,
        totalPremiumPaid: 0,
        totalFees
      };
    } else {
      // Buyer loses full premium
      return {
        grossPNL: -trade.total_premium,
        netPNL: -trade.total_premium - totalFees,
        returnPercentage: -100,
        totalPremiumReceived: 0,
        totalPremiumPaid: trade.total_premium,
        totalFees
      };
    }
  }
  
  // For EXERCISED status, PNL depends on assignment details (not calculated here)
  return {
    grossPNL: 0,
    netPNL: 0,
    returnPercentage: 0,
    totalPremiumReceived: isSell ? trade.total_premium : 0,
    totalPremiumPaid: isSell ? 0 : trade.total_premium,
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
export function formatHKD(amount: number): string {
  return `HKD ${amount.toLocaleString('en-HK', { 
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
