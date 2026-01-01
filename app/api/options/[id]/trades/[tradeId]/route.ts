import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { deleteTrade, updateTrade } from '@/db/repositories/option-trades';
import { UpdateTradeInput } from '@/db/schema';

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

// DELETE /api/options/[id]/trades/[tradeId] - Delete a trade
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; tradeId: string }> }
) {
  try {
    const supabase = getSupabaseClient(request);
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { tradeId } = await params;

    const result = await deleteTrade(tradeId, user.id);

    if (!result) {
      return NextResponse.json({ error: 'Trade not found or not authorized' }, { status: 404 });
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('Error deleting trade:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to delete trade';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

// PATCH /api/options/[id]/trades/[tradeId] - Update a trade
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; tradeId: string }> }
) {
  try {
    const supabase = getSupabaseClient(request);
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { tradeId } = await params;
    const body: UpdateTradeInput = await request.json();

    const result = await updateTrade(tradeId, user.id, body);

    if (!result) {
      return NextResponse.json({ error: 'Trade not found or not authorized' }, { status: 404 });
    }

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    console.error('Error updating trade:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to update trade';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
