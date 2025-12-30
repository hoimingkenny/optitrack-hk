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
