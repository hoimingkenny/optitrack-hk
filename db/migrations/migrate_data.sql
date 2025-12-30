-- Migration: Transfer data from options_trades to new schema
-- This script migrates existing trade data to the option-centric model

-- Step 1: Create options from unique combinations in options_trades
INSERT INTO options (user_id, stock_symbol, direction, strike_price, expiry_date, status, created_at, updated_at)
SELECT DISTINCT ON (user_id, stock_symbol, direction, strike_price, expiry_date)
  user_id,
  stock_symbol,
  direction,
  strike_price,
  expiry_date,
  status,
  MIN(created_at) OVER (PARTITION BY user_id, stock_symbol, direction, strike_price, expiry_date) as created_at,
  MAX(updated_at) OVER (PARTITION BY user_id, stock_symbol, direction, strike_price, expiry_date) as updated_at
FROM options_trades
ON CONFLICT (user_id, stock_symbol, direction, strike_price, expiry_date) DO NOTHING;

-- Step 2: Create OPEN trades from options_trades
INSERT INTO trades (option_id, user_id, trade_type, trade_date, contracts, premium, shares_per_contract, fee, stock_price, hsi, notes, created_at, updated_at)
SELECT 
  o.id as option_id,
  ot.user_id,
  'OPEN' as trade_type,
  ot.trade_date,
  ot.contracts,
  ot.premium,
  ot.shares_per_contract,
  ot.fee,
  ot.stock_price,
  ot.hsi,
  NULL as notes,
  ot.created_at,
  ot.updated_at
FROM options_trades ot
JOIN options o ON (
  o.user_id = ot.user_id AND
  o.stock_symbol = ot.stock_symbol AND
  o.direction = ot.direction AND
  o.strike_price = ot.strike_price AND
  o.expiry_date = ot.expiry_date
);

-- Step 3: Create CLOSE trades for positions that were closed
INSERT INTO trades (option_id, user_id, trade_type, trade_date, contracts, premium, shares_per_contract, fee, stock_price, hsi, notes, created_at, updated_at)
SELECT 
  o.id as option_id,
  ot.user_id,
  'CLOSE' as trade_type,
  ot.updated_at as trade_date, -- Use updated_at as close date
  ot.contracts,
  COALESCE(ot.close_premium, 0) as premium,
  ot.shares_per_contract,
  COALESCE(ot.close_fee, 0) as fee,
  COALESCE(ot.close_stock_price, ot.stock_price) as stock_price,
  COALESCE(ot.close_hsi, ot.hsi) as hsi,
  'Migrated close trade' as notes,
  ot.updated_at as created_at,
  ot.updated_at
FROM options_trades ot
JOIN options o ON (
  o.user_id = ot.user_id AND
  o.stock_symbol = ot.stock_symbol AND
  o.direction = ot.direction AND
  o.strike_price = ot.strike_price AND
  o.expiry_date = ot.expiry_date
)
WHERE ot.status = 'Closed' AND ot.close_premium IS NOT NULL;

-- Step 4: Backup the old table (optional)
-- ALTER TABLE options_trades RENAME TO options_trades_backup;

-- Verification queries:
-- SELECT COUNT(*) FROM options;
-- SELECT COUNT(*) FROM trades;
-- SELECT COUNT(*) FROM options_trades;
