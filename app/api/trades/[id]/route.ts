import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import {
  getTradeById,
  closeTrade,
  deleteTrade,
  updateTradeStatus,
} from '@/db/repositories/trades';
import { CloseTradeInput, TradeStatus } from '@/db/schema';

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

// GET /api/trades/[id] - Get a single trade
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = getSupabaseClient(request);
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const trade = await getTradeById(params.id, user.id);
    if (!trade) {
      return NextResponse.json({ error: 'Trade not found' }, { status: 404 });
    }

    return NextResponse.json({ trade });
  } catch (error) {
    console.error('Error fetching trade:', error);
    return NextResponse.json(
      { error: 'Failed to fetch trade' },
      { status: 500 }
    );
  }
}

// PATCH /api/trades/[id] - Update trade (close position or update status)
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = getSupabaseClient(request);
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();

    // Check if this is a close trade request
    if (body.close_premium !== undefined) {
      const trade = await closeTrade(params.id, user.id, body as CloseTradeInput);
      return NextResponse.json({ trade });
    }

    // Check if this is a status update
    if (body.status) {
      const trade = await updateTradeStatus(params.id, user.id, body.status as TradeStatus);
      return NextResponse.json({ trade });
    }

    return NextResponse.json(
      { error: 'Invalid update request' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Error updating trade:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update trade' },
      { status: 500 }
    );
  }
}

// DELETE /api/trades/[id] - Delete a trade
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = getSupabaseClient(request);
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await deleteTrade(params.id, user.id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting trade:', error);
    return NextResponse.json(
      { error: 'Failed to delete trade' },
      { status: 500 }
    );
  }
}
