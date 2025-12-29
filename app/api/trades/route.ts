import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import {
  getTrades,
  createTrade,
} from '@/db/repositories/trades';
import { NewTradeInput } from '@/db/schema';

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

// GET /api/trades - Get all trades for authenticated user
export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabaseClient(request);
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const trades = await getTrades(user.id);
    return NextResponse.json({ trades });
  } catch (error) {
    console.error('Error fetching trades:', error);
    return NextResponse.json(
      { error: 'Failed to fetch trades' },
      { status: 500 }
    );
  }
}

// POST /api/trades - Create a new trade
export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabaseClient(request);
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const trade = await createTrade(user.id, body as NewTradeInput);
    return NextResponse.json({ trade }, { status: 201 });
  } catch (error) {
    console.error('Error creating trade:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create trade' },
      { status: 500 }
    );
  }
}
