import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getOptionById, updateOptionStatus, deleteOption } from '@/db/repositories/options';
import { UpdateOptionInput } from '@/db/schema';

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

// GET /api/options/[id] - Get option with all trades and summary
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = getSupabaseClient(request);
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const optionWithTrades = await getOptionById(id, user.id);

    if (!optionWithTrades) {
      return NextResponse.json({ error: 'Option not found' }, { status: 404 });
    }

    return NextResponse.json(optionWithTrades, { status: 200 });
  } catch (error) {
    console.error('Error fetching option:', error);
    return NextResponse.json(
      { error: 'Failed to fetch option' },
      { status: 500 }
    );
  }
}

// PATCH /api/options/[id] - Update option status
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = getSupabaseClient(request);
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body: UpdateOptionInput = await request.json();

    const updated = await updateOptionStatus(id, user.id, body);

    if (!updated) {
      return NextResponse.json({ error: 'Option not found' }, { status: 404 });
    }

    return NextResponse.json(updated, { status: 200 });
  } catch (error) {
    console.error('Error updating option:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to update option';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

// DELETE /api/options/[id] - Delete option (cascade deletes trades)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = getSupabaseClient(request);
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const deleted = await deleteOption(id, user.id);

    if (!deleted) {
      return NextResponse.json({ error: 'Option not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('Error deleting option:', error);
    return NextResponse.json(
      { error: 'Failed to delete option' },
      { status: 500 }
    );
  }
}
