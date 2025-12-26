import { NewTradeInput, TradeDirection } from '../types/trades';

export interface ValidationError {
  field: string;
  message: string;
}

const VALID_DIRECTIONS: TradeDirection[] = ['Sell Put', 'Sell Call', 'Buy Put', 'Buy Call'];

/**
 * Validate new trade input
 */
export function validateTradeInput(input: Partial<NewTradeInput>): ValidationError[] {
  const errors: ValidationError[] = [];

  // Stock symbol
  if (!input.stock_symbol || input.stock_symbol.trim() === '') {
    errors.push({ field: 'stock_symbol', message: 'Stock symbol is required' });
  } else if (!/^[0-9]{4,5}\.HK$/i.test(input.stock_symbol.trim())) {
    errors.push({ field: 'stock_symbol', message: 'Invalid HK stock format (e.g., 03690.HK)' });
  }

  // Direction
  if (!input.direction) {
    errors.push({ field: 'direction', message: 'Trade direction is required' });
  } else if (!VALID_DIRECTIONS.includes(input.direction)) {
    errors.push({ field: 'direction', message: 'Invalid trade direction' });
  }

  // Strike price
  if (input.strike_price === undefined || input.strike_price === null) {
    errors.push({ field: 'strike_price', message: 'Strike price is required' });
  } else if (input.strike_price <= 0) {
    errors.push({ field: 'strike_price', message: 'Strike price must be greater than 0' });
  }

  // Expiry date
  if (!input.expiry_date) {
    errors.push({ field: 'expiry_date', message: 'Expiry date is required' });
  }

  // Premium
  if (input.premium === undefined || input.premium === null) {
    errors.push({ field: 'premium', message: 'Premium is required' });
  } else if (input.premium <= 0) {
    errors.push({ field: 'premium', message: 'Premium must be greater than 0' });
  }

  // Contracts
  if (input.contracts === undefined || input.contracts === null) {
    errors.push({ field: 'contracts', message: 'Number of contracts is required' });
  } else if (input.contracts <= 0) {
    errors.push({ field: 'contracts', message: 'Number of contracts must be greater than 0' });
  } else if (!Number.isInteger(input.contracts)) {
    errors.push({ field: 'contracts', message: 'Number of contracts must be a whole number' });
  }

  // Shares per contract (optional but must be valid if provided)
  if (input.shares_per_contract !== undefined && input.shares_per_contract <= 0) {
    errors.push({ field: 'shares_per_contract', message: 'Shares per contract must be greater than 0' });
  }

  // Fee (optional but must be non-negative)
  if (input.fee !== undefined && input.fee < 0) {
    errors.push({ field: 'fee', message: 'Fee cannot be negative' });
  }

  // Stock price (required, must be positive)
  if (input.stock_price === undefined || input.stock_price === null) {
    errors.push({ field: 'stock_price', message: 'Stock price is required' });
  } else if (input.stock_price <= 0) {
    errors.push({ field: 'stock_price', message: 'Stock price must be greater than 0' });
  }

  // HSI (required, must be positive)
  if (input.hsi === undefined || input.hsi === null) {
    errors.push({ field: 'hsi', message: 'HSI is required' });
  } else if (input.hsi <= 0) {
    errors.push({ field: 'hsi', message: 'HSI must be greater than 0' });
  }

  return errors;
}

/**
 * Validate close trade input
 */
export function validateCloseTradeInput(input: { close_premium?: number; close_fee?: number }): ValidationError[] {
  const errors: ValidationError[] = [];

  if (input.close_premium === undefined || input.close_premium === null) {
    errors.push({ field: 'close_premium', message: 'Close premium is required' });
  } else if (input.close_premium < 0) {
    errors.push({ field: 'close_premium', message: 'Close premium cannot be negative' });
  }

  if (input.close_fee !== undefined && input.close_fee < 0) {
    errors.push({ field: 'close_fee', message: 'Close fee cannot be negative' });
  }

  return errors;
}

/**
 * Sanitize stock symbol (uppercase, trim, add .HK if missing)
 */
export function sanitizeStockSymbol(symbol: string): string {
  let clean = symbol.trim().toUpperCase();
  if (!clean.endsWith('.HK')) {
    clean = clean + '.HK';
  }
  // Pad to 5 digits if needed
  const match = clean.match(/^(\d+)\.HK$/);
  if (match) {
    const code = match[1].padStart(5, '0');
    return `${code}.HK`;
  }
  return clean;
}

/**
 * Format stock symbol for display
 */
export function formatStockSymbol(symbol: string): string {
  const match = symbol.match(/^(\d{4,5})\.HK$/i);
  if (match) {
    const code = match[1].padStart(5, '0');
    return `${code}.HK`;
  }
  return symbol;
}

/**
 * Check if value is a valid positive number
 */
export function isValidPositiveNumber(value: unknown): value is number {
  return typeof value === 'number' && value > 0 && !isNaN(value);
}

/**
 * Check if value is a valid non-negative number
 */
export function isValidNonNegativeNumber(value: unknown): value is number {
  return typeof value === 'number' && value >= 0 && !isNaN(value);
}

/**
 * Parse number input (handles empty string)
 */
export function parseNumberInput(value: string): number | undefined {
  if (value === '' || value === null || value === undefined) {
    return undefined;
  }
  const num = parseFloat(value);
  return isNaN(num) ? undefined : num;
}
