import { Trade, TradeStatus, TradeDirection } from '../types/trades';

/**
 * Calculate the current status of a trade based on dates and market conditions
 */
export function calculateTradeStatus(
  trade: Trade, 
  currentDate: Date = new Date()
): TradeStatus {
  // Already closed by user
  if (trade.status === 'Closed') {
    return 'Closed';
  }
  
  const expiryDate = new Date(trade.expiry_date);
  expiryDate.setHours(23, 59, 59, 999); // End of expiry day
  
  // Not yet expired
  if (currentDate <= expiryDate) {
    return 'Open';
  }
  
  // Expired - check if exercised or lapsed based on close_stock_price if available
  const priceToCheck = trade.close_stock_price ?? trade.stock_price;
  if (priceToCheck !== null && priceToCheck !== undefined) {
    const isITM = checkIfITM(trade.direction, trade.strike_price, priceToCheck);
    if (isITM) {
      return 'Exercised';
    } else {
      return 'Lapsed';
    }
  }
  
  // Expired but no stock price to determine ITM/OTM
  return 'Expired';
}

/**
 * Check if option is In-The-Money
 */
export function checkIfITM(
  direction: TradeDirection, 
  strikePrice: number, 
  stockPrice: number
): boolean {
  switch (direction) {
    case 'Sell Put':
    case 'Buy Put':
      // Put is ITM when stock price < strike price
      return stockPrice < strikePrice;
    case 'Sell Call':
    case 'Buy Call':
      // Call is ITM when stock price > strike price
      return stockPrice > strikePrice;
    default:
      return false;
  }
}

/**
 * Get days remaining until expiry
 */
export function getDaysToExpiry(expiryDate: string, fromDate: Date = new Date()): number {
  const expiry = new Date(expiryDate);
  expiry.setHours(0, 0, 0, 0);
  const from = new Date(fromDate);
  from.setHours(0, 0, 0, 0);
  return Math.ceil((expiry.getTime() - from.getTime()) / (1000 * 60 * 60 * 24));
}

/**
 * Calculate hold days for a trade
 */
export function calculateHoldDays(trade: Trade): number {
  const openDate = new Date(trade.trade_date);
  const closeDate = trade.status === 'Closed' || trade.status === 'Exercised' || trade.status === 'Lapsed'
    ? new Date() // Use current date for closed trades without explicit close date
    : new Date(trade.expiry_date);
  
  openDate.setHours(0, 0, 0, 0);
  closeDate.setHours(0, 0, 0, 0);
  
  return Math.max(0, Math.ceil((closeDate.getTime() - openDate.getTime()) / (1000 * 60 * 60 * 24)));
}

/**
 * Check if a trade has expired
 */
export function isTradeExpired(expiryDate: string): boolean {
  return getDaysToExpiry(expiryDate) < 0;
}

/**
 * Get status badge color class
 */
export function getStatusColor(status: TradeStatus): string {
  switch (status) {
    case 'Open':
      return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
    case 'Closed':
      return 'bg-green-500/20 text-green-400 border-green-500/30';
    case 'Expired':
      return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    case 'Exercised':
      return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
    case 'Lapsed':
      return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    default:
      return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
  }
}

/**
 * Get direction badge color class
 */
export function getDirectionColor(direction: TradeDirection): string {
  switch (direction) {
    case 'Sell Put':
      return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
    case 'Sell Call':
      return 'bg-teal-500/20 text-teal-400 border-teal-500/30';
    case 'Buy Put':
      return 'bg-pink-500/20 text-pink-400 border-pink-500/30';
    case 'Buy Call':
      return 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30';
    default:
      return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
  }
}

/**
 * Get human-readable status label
 */
export function getStatusLabel(status: TradeStatus): string {
  return status; // Already human-readable
}

/**
 * Get human-readable direction label
 */
export function getDirectionLabel(direction: TradeDirection): string {
  return direction; // Already human-readable
}

/**
 * Update expired trades status based on current date
 * Returns trades that were updated
 */
export function checkAndUpdateExpiredTrades(
  trades: Trade[], 
  currentDate: Date = new Date()
): { trade: Trade; newStatus: TradeStatus }[] {
  const updates: { trade: Trade; newStatus: TradeStatus }[] = [];
  
  for (const trade of trades) {
    if (trade.status !== 'Open') continue;
    
    const newStatus = calculateTradeStatus(trade, currentDate);
    if (newStatus !== 'Open') {
      updates.push({ trade, newStatus });
    }
  }
  
  return updates;
}
