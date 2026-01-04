import { NewTradeInput, TradeDirection, OptionType } from '../types/trades';

export interface ValidationError {
  field: string;
  message: string;
}

const VALID_DIRECTIONS: TradeDirection[] = ['Buy', 'Sell'];
const VALID_OPTION_TYPES: OptionType[] = ['Call', 'Put'];

/**
 * Validate new trade input
 */
export function validateTradeInput(input: Partial<NewTradeInput>): ValidationError[] {
  const errors: ValidationError[] = [];

  // Stock symbol
  if (!input.stock_symbol || input.stock_symbol.trim() === '') {
    errors.push({ field: 'stock_symbol', message: 'Stock symbol is required' });
  } else if (!/^(HK\.)?[0-9]{4,5}\.HK$/i.test(input.stock_symbol.trim()) && !/^[0-9]{4,5}$/.test(input.stock_symbol.trim())) {
    // Be more flexible with the format during validation if it's already been sanitized
    // or if it's just the numeric code
  }

  // Direction
  if (!input.direction) {
    errors.push({ field: 'direction', message: 'Trade direction is required' });
  } else if (!VALID_DIRECTIONS.includes(input.direction)) {
    errors.push({ field: 'direction', message: 'Invalid trade direction' });
  }

  // Option Type
  if (!input.option_type) {
    errors.push({ field: 'option_type', message: 'Option type is required' });
  } else if (!VALID_OPTION_TYPES.includes(input.option_type)) {
    errors.push({ field: 'option_type', message: 'Invalid option type' });
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
  if (input.shares_per_contract !== undefined && input.shares_per_contract < 0) {
    errors.push({ field: 'shares_per_contract', message: 'Shares per contract cannot be negative' });
  }

  // Fee (optional but must be non-negative)
  if (input.fee !== undefined && input.fee < 0) {
    errors.push({ field: 'fee', message: 'Fee cannot be negative' });
  }

  // Margin Percent (optional but must be non-negative)
  if (input.margin_percent !== undefined && input.margin_percent < 0) {
    errors.push({ field: 'margin_percent', message: 'Margin % cannot be negative' });
  }

  // Stock price (required, must be non-negative)
  if (input.stock_price === undefined || input.stock_price === null) {
    errors.push({ field: 'stock_price', message: 'Stock price is required' });
  } else if (input.stock_price < 0) {
    errors.push({ field: 'stock_price', message: 'Stock price cannot be negative' });
  }

  // HSI (required, must be non-negative)
  if (input.hsi === undefined || input.hsi === null) {
    errors.push({ field: 'hsi', message: 'HSI is required' });
  } else if (input.hsi < 0) {
    errors.push({ field: 'hsi', message: 'HSI cannot be negative' });
  }

  // Trade Date
  if (input.trade_date === undefined || input.trade_date === null || input.trade_date === '') {
    // It's optional in type but we want to ensure it's valid if we are using it from the form
    // If the form provides it, we should check it.
    // But if it's optional, maybe we skip.
    // However, for the "Add New Option" form, we want it.
    // Let's rely on the form's required attribute for existence, 
    // but here we can check if it's a valid date string if present.
  }
  
  if (input.trade_date && isNaN(Date.parse(input.trade_date))) {
    errors.push({ field: 'trade_date', message: 'Invalid trade date' });
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
  
  // Remove HK. prefix if it exists
  if (clean.startsWith('HK.')) {
    clean = clean.substring(3);
  }
  
  // Add .HK suffix if missing
  if (!clean.endsWith('.HK')) {
    clean = clean + '.HK';
  }
  
  // Pad numeric part to 4 or 5 digits
  const match = clean.match(/^(\d+)\.HK$/);
  if (match) {
    const code = match[1];
    if (code.length < 4) {
      return `${code.padStart(4, '0')}.HK`;
    }
  }
  return clean;
}

/**
 * Format stock symbol for display
 */
export function formatStockSymbol(symbol: string): string {
  const match = symbol.match(/^(\d{4,5})\.HK$/i);
  if (match) {
    const code = match[1].padStart(4, '0');
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
