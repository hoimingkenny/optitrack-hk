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
  return direction === 'Sell';
}

/**
 * Check if trade type is an opening trade (entry)
 */
export function isOpeningTrade(tradeType: string): boolean {
  return tradeType === 'OPEN_SELL' || tradeType === 'OPEN_BUY' || tradeType === 'OPEN' || tradeType === 'ADD';
}

/**
 * Check if trade type is a closing trade (exit)
 */
export function isClosingTrade(tradeType: string): boolean {
  return tradeType === 'CLOSE_BUY' || tradeType === 'CLOSE_SELL' || tradeType === 'REDUCE' || tradeType === 'CLOSE';
}

/**
 * Calculate net contracts from all trades
 * OPEN and ADD increase position, REDUCE and CLOSE decrease position
 */
export function calculateNetContracts(trades: Trade[]): number {
  return trades.reduce((total, trade) => {
    const contracts = parseNumeric(trade.contracts);
    if (isOpeningTrade(trade.trade_type)) {
      return total + contracts;
    } else if (isClosingTrade(trade.trade_type)) {
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
    .filter(t => isOpeningTrade(t.trade_type))
    .reduce((sum, trade) => sum + parseNumeric(trade.contracts), 0);
}

/**
 * Calculate total contracts closed (REDUCE + CLOSE)
 */
export function calculateTotalClosed(trades: Trade[]): number {
  return trades
    .filter(t => isClosingTrade(t.trade_type))
    .reduce((sum, trade) => sum + parseNumeric(trade.contracts), 0);
}

/**
 * Calculate position statistics using chronological processing
 * This handles partial closes, final closes, and re-opens correctly
 */
function calculatePositionStats(trades: Trade[], direction?: TradeDirection) {
  // Sort trades by date to ensure chronological processing
  // Use created_at as tie-breaker for trades on the same day
  const sortedTrades = [...trades].sort((a, b) => {
    const timeA = new Date(a.trade_date).getTime();
    const timeB = new Date(b.trade_date).getTime();
    if (timeA !== timeB) return timeA - timeB;
    
    // Tie-breaker: created_at
    const createdA = a.created_at ? new Date(a.created_at).getTime() : 0;
    const createdB = b.created_at ? new Date(b.created_at).getTime() : 0;
    return createdA - createdB;
  });

  let netContracts = 0;
  let avgCost = 0;
  let realizedPNL = 0;
  
  const isSell = direction === 'Sell';

  for (const trade of sortedTrades) {
    const contracts = parseNumeric(trade.contracts);
    const premium = parseNumeric(trade.premium);
    const shares = parseNumeric(trade.shares_per_contract) || DEFAULT_SHARES_PER_CONTRACT;
    
    if (isOpeningTrade(trade.trade_type)) {
      // Weighted Average for Opening
      const totalCost = (netContracts * avgCost) + (contracts * premium);
      netContracts += contracts;
      avgCost = netContracts > 0 ? totalCost / netContracts : 0;
    } else {
      // Closing
      const closeContracts = Math.min(contracts, netContracts); // Clamp to available
      
      if (closeContracts > 0) {
        if (direction) {
          if (isSell) {
            // Seller: Profit = (Entry - Exit)
            realizedPNL += (avgCost - premium) * closeContracts * shares;
          } else {
            // Buyer: Profit = (Exit - Entry)
            realizedPNL += (premium - avgCost) * closeContracts * shares;
          }
        }
        netContracts -= closeContracts;
      }
      
      // If position closed fully, reset avgCost
      if (netContracts <= 0) {
        netContracts = 0;
        avgCost = 0;
      }
    }
  }

  return { netContracts, avgCost, realizedPNL };
}

/**
 * Calculate average entry premium (weighted by contracts of CURRENT position)
 */
export function calculateAverageEntryPremium(trades: Trade[]): number {
  return calculatePositionStats(trades).avgCost;
}

/**
 * Calculate average exit premium (weighted by contracts)
 */
export function calculateAverageExitPremium(trades: Trade[]): number {
  const closeTrades = trades.filter(t => 
    isClosingTrade(t.trade_type)
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
    pnl = (avgEntry - avgExit) * closedContracts * (parseNumeric(trades[0]?.shares_per_contract) || DEFAULT_SHARES_PER_CONTRACT);
  } else {
    // Buyer: Pay premium at open, receive at close
    pnl = (avgExit - avgEntry) * closedContracts * (parseNumeric(trades[0]?.shares_per_contract) || DEFAULT_SHARES_PER_CONTRACT);
  }
  
  return pnl;
}

/**
 * Calculate unrealized PNL for open contracts
 * @param option The option position
 * @param trades All trades for this option
 * @param currentPremium Optional current market premium (e.g. from Futu snapshot)
 */
export function calculateUnrealizedPNL(
  option: Option,
  trades: Trade[],
  currentPremium?: number
): number {
  const netContracts = calculateNetContracts(trades);
  if (netContracts === 0 || currentPremium === undefined) return 0;
  
  const isSell = isSellDirection(option.direction);
  const shares = parseNumeric(trades[0]?.shares_per_contract) || DEFAULT_SHARES_PER_CONTRACT;
  const avgEntry = calculateAverageEntryPremium(trades);

  // For Sellers (Short): PNL = (Entry Premium - Current Premium) * contracts * shares
  // For Buyers (Long): PNL = (Current Premium - Entry Premium) * contracts * shares
  if (isSell) {
    return (avgEntry - currentPremium) * netContracts * shares;
  } else {
    return (currentPremium - avgEntry) * netContracts * shares;
  }
}

/**
 * Calculate total margin required for current position
 */
export function calculateTotalMargin(
  option: Option,
  trades: Trade[]
): number {
  const netContracts = calculateNetContracts(trades);
  if (netContracts === 0) return 0;

  const openTrades = trades.filter(t => 
    isOpeningTrade(t.trade_type)
  );

  let weightedMarginSum = 0;
  let totalOpenContracts = 0;

  openTrades.forEach(trade => {
    const contracts = parseNumeric(trade.contracts);
    const marginPercent = parseNumeric(trade.margin_percent);
    weightedMarginSum += contracts * marginPercent;
    totalOpenContracts += contracts;
  });

  const avgMarginPercent = totalOpenContracts > 0 ? weightedMarginSum / totalOpenContracts : 0;
  const shares = parseNumeric(trades[0]?.shares_per_contract) || DEFAULT_SHARES_PER_CONTRACT;
  const strikePrice = parseNumeric(option.strike_price);

  // Margin = Notional Value * Margin %
  // Using Strike Price for Notional Value as it represents the liability
  return netContracts * shares * strikePrice * (avgMarginPercent / 100);
}

/**
 * Calculate complete PNL summary for an option
 * PNL = sum(premium * contracts * shares) for all trades - total fees
 */
export function calculateOptionPNL(
  option: Option,
  trades: Trade[],
  currentPremium?: number
): OptionPNL {
  const totalOpened = calculateTotalOpened(trades);
  const totalClosed = calculateTotalClosed(trades);
  const { netContracts, avgCost, realizedPNL } = calculatePositionStats(trades, option.direction);
  const avgEntryPremium = avgCost;
  const avgExitPremium = calculateAverageExitPremium(trades);
  const totalFees = calculateTotalFees(trades);
  const totalMargin = calculateTotalMargin(option, trades);
  
  // Calculate PNL as sum of all (premium * contracts * shares) - fees
  // For Sell options: Received (+) at open, Paid (-) at close
  // For Buy options: Paid (-) at open, Received (+) at close
  const isSell = isSellDirection(option.direction);
  
  // Recalculate unrealized PNL using the chronological stats
  const shares = parseNumeric(trades[0]?.shares_per_contract) || DEFAULT_SHARES_PER_CONTRACT;
  let unrealizedPNL = 0;
  if (netContracts > 0 && currentPremium !== undefined) {
    if (isSell) {
      unrealizedPNL = (avgEntryPremium - currentPremium) * netContracts * shares;
    } else {
      unrealizedPNL = (currentPremium - avgEntryPremium) * netContracts * shares;
    }
  }

  // Net PNL = Realized PNL + Unrealized PNL - Total Fees
  // This ensures the formula: Realized + Unrealized - Fees is strictly followed
  const netPNL = realizedPNL + unrealizedPNL - totalFees;
  
  // Calculate Gross PNL (Realized + Unrealized) for reference
  const grossPNL = realizedPNL + unrealizedPNL;

  // Calculate market value of current position (Cost to Close)
  // Market Value = Net Contracts * Current Price * Shares
  const marketValue = (netContracts > 0 && currentPremium !== undefined)
    ? netContracts * currentPremium * shares
    : 0;
  
  // Calculate return percentage based on total premium invested or margin used
  let returnPercentage = 0;
  
  if (isSell) {
    // For sellers, return is based on margin used (if available) or max risk (approx. strike * shares)
    // Using totalMargin if available, otherwise fallback to notional value
    const base = totalMargin > 0 ? totalMargin : (parseNumeric(option.strike_price) * totalOpened * shares);
    returnPercentage = base > 0 ? (netPNL / base) * 100 : 0;
  } else {
    // For buyers, return is based on premium paid
    const totalInvested = avgEntryPremium * totalOpened * shares;
    returnPercentage = totalInvested > 0 ? (netPNL / totalInvested) * 100 : 0;
  }
  
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
    totalMargin,
    marketValue,
  };
}

/**
 * Format option description (for display)
 */
export function formatOptionDescription(option: Option): string {
  const strike = parseNumeric(option.strike_price);
  const symbol = option.stock_symbol || 'Unknown';
  return `${symbol} ${option.direction} HKD ${strike.toFixed(2)}`;
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
  if (!isOpeningTrade(newTrade.trade_type) && trades.length === 0) {
    return { valid: false, error: 'Cannot add trade - no position exists' };
  }
  
  // REDUCE and CLOSE cannot exceed current position
  if (isClosingTrade(newTrade.trade_type)) {
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

  // Cannot add trades to expired option with no position
  if (option.status === 'Expired' && netContracts === 0) {
    return { valid: false, error: 'Cannot add trades to expired option with zero net position' };
  }
  
  return { valid: true };
}
