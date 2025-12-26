# Supabase Database Setup Guide

## Prerequisites
- Supabase account (sign up at https://supabase.com)
- Project created in Supabase dashboard

## Step 1: Create Database Tables

Navigate to your Supabase project → SQL Editor and run the following SQL:

### Create options_trades Table

```sql
-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create options_trades table
CREATE TABLE options_trades (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  
  -- Trade Details
  stock_symbol TEXT NOT NULL, -- e.g., "0369.HK"
  direction TEXT NOT NULL CHECK (direction IN ('Sell Put', 'Sell Call', 'Buy Put', 'Buy Call')),
  strike_price NUMERIC NOT NULL,
  expiry_date DATE NOT NULL,
  
  -- Position Details
  premium NUMERIC NOT NULL CHECK (premium > 0), -- HKD per share
  contracts INTEGER NOT NULL CHECK (contracts > 0),
  shares_per_contract INTEGER NOT NULL DEFAULT 500,
  fee NUMERIC NOT NULL DEFAULT 0,
  total_premium NUMERIC GENERATED ALWAYS AS (premium * contracts * shares_per_contract) STORED,
  stock_price NUMERIC NOT NULL, -- Stock price at open
  hsi NUMERIC NOT NULL, -- HSI at open
  trade_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  
  -- Closing Details (nullable until closed)
  close_premium NUMERIC CHECK (close_premium > 0),
  close_fee NUMERIC DEFAULT 0,
  close_stock_price NUMERIC,
  close_hsi NUMERIC,
  
  -- Status
  status TEXT NOT NULL DEFAULT 'Open' CHECK (status IN ('Open', 'Closed', 'Expired', 'Exercised', 'Lapsed')),
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Add comment to table
COMMENT ON TABLE options_trades IS 'Hong Kong stock options trades for OptiTrack HK';
```

### Create Indexes

```sql
-- Indexes for better query performance
CREATE INDEX idx_options_trades_user_id ON options_trades(user_id);
CREATE INDEX idx_options_trades_stock_symbol ON options_trades(stock_symbol);
CREATE INDEX idx_options_trades_status ON options_trades(status);
CREATE INDEX idx_options_trades_expiry_date ON options_trades(expiry_date);
CREATE INDEX idx_options_trades_trade_date ON options_trades(trade_date DESC);
CREATE INDEX idx_options_trades_direction ON options_trades(direction);
```

### Enable Row Level Security (RLS)

```sql
-- Enable RLS
ALTER TABLE options_trades ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own trades
CREATE POLICY "Users can view own trades" 
  ON options_trades FOR SELECT 
  USING (auth.uid() = user_id);

-- Policy: Users can insert their own trades
CREATE POLICY "Users can insert own trades" 
  ON options_trades FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own trades
CREATE POLICY "Users can update own trades" 
  ON options_trades FOR UPDATE 
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can delete their own trades
CREATE POLICY "Users can delete own trades" 
  ON options_trades FOR DELETE 
  USING (auth.uid() = user_id);
```

### Create Updated_At Trigger

```sql
-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at
CREATE TRIGGER update_options_trades_updated_at
  BEFORE UPDATE ON options_trades
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

## Step 2: Configure Authentication

### Enable Email Authentication
1. Go to Authentication → Providers in Supabase dashboard
2. Enable "Email" provider
3. Configure settings:
   - Enable "Confirm email" (optional for MVP, can disable for easier testing)
   - Set password minimum length to 6

### Disable Email Confirmation (Optional - for easier testing)
1. Go to Authentication → Settings
2. Under "Email Auth", disable "Enable email confirmations"

## Step 3: Get API Credentials

1. Go to Project Settings → API
2. Copy the following values:
   - **Project URL**: `https://xxxxx.supabase.co`
   - **Anon/Public Key**: `eyJhbGc...` (starts with eyJ)

## Step 4: Configure Environment Variables

Create a `.env.local` file in your project root:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

**Important**: Never commit `.env.local` to version control!

## Step 5: Verify Setup

Run this SQL query to test:

```sql
-- Check if table exists
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'options_trades';

-- Check RLS policies
SELECT * FROM pg_policies WHERE tablename = 'options_trades';
```

## Full SQL Script (Copy & Paste)

For convenience, here's the complete SQL to run in one go:

```sql
-- ============================================
-- OptiTrack HK Database Setup
-- Table: options_trades
-- ============================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Drop existing table if recreating
-- DROP TABLE IF EXISTS options_trades;

CREATE TABLE options_trades (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  stock_symbol TEXT NOT NULL,
  direction TEXT NOT NULL CHECK (direction IN ('Sell Put', 'Sell Call', 'Buy Put', 'Buy Call')),
  strike_price NUMERIC NOT NULL,
  expiry_date DATE NOT NULL,
  premium NUMERIC NOT NULL CHECK (premium > 0),
  contracts INTEGER NOT NULL CHECK (contracts > 0),
  shares_per_contract INTEGER NOT NULL DEFAULT 500,
  fee NUMERIC NOT NULL DEFAULT 0,
  total_premium NUMERIC GENERATED ALWAYS AS (premium * contracts * shares_per_contract) STORED,
  stock_price NUMERIC NOT NULL,
  hsi NUMERIC NOT NULL,
  trade_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  close_premium NUMERIC CHECK (close_premium > 0),
  close_fee NUMERIC DEFAULT 0,
  close_stock_price NUMERIC,
  close_hsi NUMERIC,
  status TEXT NOT NULL DEFAULT 'Open' CHECK (status IN ('Open', 'Closed', 'Expired', 'Exercised', 'Lapsed')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_options_trades_user_id ON options_trades(user_id);
CREATE INDEX idx_options_trades_stock_symbol ON options_trades(stock_symbol);
CREATE INDEX idx_options_trades_status ON options_trades(status);
CREATE INDEX idx_options_trades_expiry_date ON options_trades(expiry_date);
CREATE INDEX idx_options_trades_trade_date ON options_trades(trade_date DESC);
CREATE INDEX idx_options_trades_direction ON options_trades(direction);

-- RLS
ALTER TABLE options_trades ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own trades" ON options_trades FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own trades" ON options_trades FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own trades" ON options_trades FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own trades" ON options_trades FOR DELETE USING (auth.uid() = user_id);

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_options_trades_updated_at
  BEFORE UPDATE ON options_trades
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

SELECT 'Setup complete! Table options_trades created with RLS enabled.' as status;
```

## Troubleshooting

### Common Issues

**Issue**: Cannot insert trades  
**Solution**: Make sure RLS policies are created and user is authenticated

**Issue**: "duplicate key value violates unique constraint"  
**Solution**: Trade ID already exists. Each trade must have unique symbol+strike+expiry+direction combination

**Issue**: Database connection error  
**Solution**: Check `.env.local` file has correct credentials

---

**Last Updated**: December 25, 2025  
**Version**: 3.0 (Updated to options_trades table with UUID, computed total_premium)
