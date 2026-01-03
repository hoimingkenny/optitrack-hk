import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getOptionsWithSummary, createOptionWithTrade } from '@/db/repositories/options';
import { CreateOptionWithTradeInput } from '@/db/schema';

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

// GET /api/options - List all options for user
export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabaseClient(request);
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const options = await getOptionsWithSummary(user.id);

    return NextResponse.json({ options }, { status: 200 });
  } catch (error) {
    console.error('Error fetching options:', error);
    return NextResponse.json(
      { error: 'Failed to fetch options' },
      { status: 500 }
    );
  }
}

// POST /api/options - Create new option with initial trade
export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabaseClient(request);
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body: CreateOptionWithTradeInput = await request.json();

    // Validate required fields
    if (!body.option || !body.trade) {
      return NextResponse.json(
        { error: 'Missing option or trade data' },
        { status: 400 }
      );
    }

    const { option: optionData, trade: tradeData } = body;

    // Validate option data
    if (!optionData.stock_symbol || !optionData.direction || 
        !optionData.strike_price || !optionData.expiry_date) {
      return NextResponse.json(
        { error: 'Missing required option fields' },
        { status: 400 }
      );
    }

    // Validate trade data
    if (tradeData.contracts === undefined || tradeData.premium === undefined || 
        tradeData.stock_price === undefined || tradeData.hsi === undefined) {
      return NextResponse.json(
        { error: 'Missing required trade fields' },
        { status: 400 }
      );
    }

    const result = await createOptionWithTrade(user.id, optionData, tradeData);

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error('Error creating option:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to create option';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
