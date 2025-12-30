import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createTrade } from '@/db/repositories/option-trades';
import { CreateTradeInput } from '@/db/schema';

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

// POST /api/options/[id]/trades - Add a new trade to an option
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = getSupabaseClient(request);
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: optionId } = await params;
    const body: CreateTradeInput = await request.json();

    // Validate required fields
    if (!body.trade_type || !body.contracts || !body.premium || 
        !body.stock_price || body.hsi === undefined) {
      return NextResponse.json(
        { error: 'Missing required trade fields' },
        { status: 400 }
      );
    }

    const result = await createTrade(optionId, user.id, body);

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error('Error creating trade:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to create trade';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
