import { createClient } from '@supabase/supabase-js';
import { Trade, NewTradeInput, CloseTradeInput, TradeStatus, generateTradeId } from './types/trades';
import { calculateTotalPremium, DEFAULT_SHARES_PER_CONTRACT } from './helpers/pnl-calculator';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Table name
const TABLE_NAME = 'options_trades';

// ============ AUTH HELPERS ============

/**
 * Get current authenticated user
 */
export async function getCurrentUser() {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error) throw error;
  return user;
}

/**
 * Sign up with email/password
 */
export async function signUp(email: string, password: string) {
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) throw error;
  return data;
}

/**
 * Sign in with email/password
 */
export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

/**
 * Sign out
 */
export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

// ============ TRADE CRUD ============

/**
 * Fetch all trades for the authenticated user
 */
export async function getTrades(userId: string) {
  const { data, error } = await supabase
    .from(TABLE_NAME)
    .select('*')
    .eq('user_id', userId)
    .order('trade_date', { ascending: false });

  if (error) throw error;
  return data as Trade[];
}

/**
 * Fetch a single trade by ID
 */
export async function getTradeById(id: string, userId: string) {
  const { data, error } = await supabase
    .from(TABLE_NAME)
    .select('*')
    .eq('id', id)
    .eq('user_id', userId)
    .single();

  if (error) throw error;
  return data as Trade;
}

/**
 * Create a new trade
 */
export async function createTrade(userId: string, input: NewTradeInput) {
  const sharesPerContract = input.shares_per_contract || DEFAULT_SHARES_PER_CONTRACT;
  const totalPremium = calculateTotalPremium(input.premium, input.contracts, sharesPerContract);
  const tradeId = generateTradeId(input.stock_symbol, input.strike_price, input.expiry_date, input.direction);

  const { data, error } = await supabase
    .from(TABLE_NAME)
    .insert({
      user_id: userId,
      stock_symbol: input.stock_symbol.toUpperCase(),
      direction: input.direction,
      strike_price: input.strike_price,
      expiry_date: input.expiry_date,
      premium: input.premium,
      contracts: input.contracts,
      shares_per_contract: sharesPerContract,
      fee: input.fee || 0,
      stock_price: input.stock_price || null,
      hsi: input.hsi || null,
      trade_date: input.trade_date || new Date().toISOString(),
      status: 'Open'
    })
    .select()
    .single();

  if (error) throw error;
  return data as Trade;
}

/**
 * Close a trade position
 */
export async function closeTrade(id: string, userId: string, closeData: CloseTradeInput) {
  // First get the trade to calculate close_total_premium
  const trade = await getTradeById(id, userId);
  const closeTotalPremium = calculateTotalPremium(
    closeData.close_premium, 
    trade.contracts, 
    trade.shares_per_contract
  );
  
  // Calculate PNL
  const isSellDirection = trade.direction === 'Sell Put' || trade.direction === 'Sell Call';
  const grossPNL = isSellDirection 
    ? trade.total_premium - closeTotalPremium
    : closeTotalPremium - trade.total_premium;
  const totalFees = (trade.fee || 0) + (closeData.close_fee || 0);
  const netPNL = grossPNL - totalFees;

  const { data, error } = await supabase
    .from(TABLE_NAME)
    .update({
      close_premium: closeData.close_premium,
      close_total_premium: closeTotalPremium,
      close_fee: closeData.close_fee || 0,
      close_stock_price: closeData.close_stock_price || null,
      close_hsi: closeData.close_hsi || null,
      closing_date: closeData.closing_date || new Date().toISOString(),
      gross_pnl: grossPNL,
      net_pnl: netPNL,
      status: 'Closed'
    })
    .eq('id', id)
    .eq('user_id', userId)
    .select()
    .single();

  if (error) throw error;
  return data as Trade;
}

/**
 * Update trade status
 */
export async function updateTradeStatus(id: string, userId: string, status: TradeStatus) {
  const { data, error } = await supabase
    .from(TABLE_NAME)
    .update({ status })
    .eq('id', id)
    .eq('user_id', userId)
    .select()
    .single();

  if (error) throw error;
  return data as Trade;
}

/**
 * Update a trade
 */
export async function updateTrade(id: string, userId: string, updates: Partial<Trade>) {
  const { data, error } = await supabase
    .from(TABLE_NAME)
    .update(updates)
    .eq('id', id)
    .eq('user_id', userId)
    .select()
    .single();

  if (error) throw error;
  return data as Trade;
}

/**
 * Delete a trade
 */
export async function deleteTrade(id: string, userId: string) {
  const { error } = await supabase
    .from(TABLE_NAME)
    .delete()
    .eq('id', id)
    .eq('user_id', userId);

  if (error) throw error;
}

// ============ TRADE QUERIES ============

/**
 * Search trades by stock symbol
 */
export async function searchTradesBySymbol(userId: string, symbol: string) {
  const { data, error } = await supabase
    .from(TABLE_NAME)
    .select('*')
    .eq('user_id', userId)
    .ilike('stock_symbol', `%${symbol}%`)
    .order('trade_date', { ascending: false });

  if (error) throw error;
  return data as Trade[];
}

/**
 * Filter trades by status
 */
export async function filterTradesByStatus(userId: string, status: TradeStatus) {
  const { data, error } = await supabase
    .from(TABLE_NAME)
    .select('*')
    .eq('user_id', userId)
    .eq('status', status)
    .order('trade_date', { ascending: false });

  if (error) throw error;
  return data as Trade[];
}

/**
 * Get unique stock symbols for user
 */
export async function getUniqueStockSymbols(userId: string) {
  const { data, error } = await supabase
    .from(TABLE_NAME)
    .select('stock_symbol')
    .eq('user_id', userId);

  if (error) throw error;
  
  const symbols = [...new Set(data?.map(t => t.stock_symbol) || [])];
  return symbols.sort();
}

/**
 * Get trades by stock symbol
 */
export async function getTradesByStock(userId: string, symbol: string) {
  const { data, error } = await supabase
    .from(TABLE_NAME)
    .select('*')
    .eq('user_id', userId)
    .eq('stock_symbol', symbol.toUpperCase())
    .order('trade_date', { ascending: false });

  if (error) throw error;
  return data as Trade[];
}

/**
 * Get open trades (for expiry checking)
 */
export async function getOpenTrades(userId: string) {
  const { data, error } = await supabase
    .from(TABLE_NAME)
    .select('*')
    .eq('user_id', userId)
    .eq('status', 'Open')
    .order('expiry_date', { ascending: true });

  if (error) throw error;
  return data as Trade[];
}

/**
 * Batch update trade statuses (for expiry checking)
 */
export async function batchUpdateTradeStatuses(
  userId: string, 
  updates: { id: string; status: TradeStatus }[]
) {
  const promises = updates.map(({ id, status }) => 
    updateTradeStatus(id, userId, status)
  );
  return Promise.all(promises);
}
