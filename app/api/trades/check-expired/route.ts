import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getOpenTrades, batchUpdateTradeStatuses } from '@/db/repositories/trades';
import { checkAndUpdateExpiredTrades } from '@/utils/helpers/status-calculator';

// Create Supabase client for API routes
function getSupabaseClient(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const token = authHeader?.replace('Bearer ', '');
  
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      },
    }
  );
  
  return supabase;
}

// GET /api/trades/check-expired - Check and update expired trades
export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabaseClient(request);
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const openTrades = await getOpenTrades(user.id);
    const updates = checkAndUpdateExpiredTrades(openTrades);

    if (updates.length > 0) {
      await batchUpdateTradeStatuses(
        user.id,
        updates.map(u => ({ id: u.trade.id, status: u.newStatus }))
      );
    }

    return NextResponse.json({ updatedCount: updates.length });
  } catch (error) {
    console.error('Error checking expired trades:', error);
    return NextResponse.json(
      { error: 'Failed to check expired trades' },
      { status: 500 }
    );
  }
}
