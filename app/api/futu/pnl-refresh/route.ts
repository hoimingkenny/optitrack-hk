import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getOptionsWithSummary } from '@/db/repositories/options';
import globalClient, { toNumber } from '@/utils/futu/client';
import { calculateOptionPNL } from '@/utils/helpers/option-calculator';

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

export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabaseClient(request);
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 1. Get all open options for the user
    const optionsWithSummary = await getOptionsWithSummary(user.id);
    const openOptions = optionsWithSummary.filter(o => o.status === 'Open' && o.futu_code);

    if (openOptions.length === 0) {
      return NextResponse.json({ updates: [] });
    }

    // 2. Prepare codes for Futu snapshot
    const codes = openOptions.map(o => {
      const [market, code] = (o.futu_code as string).split('.');
      return {
        market: market === 'HK' ? 1 : 2, // 1 for HK, 2 for US
        code: code
      };
    });

    // 3. Fetch snapshots from Futu
    const snapshots = await globalClient.getSecuritySnapshots(codes);
    
    // 4. Map snapshots back to options and recalculate PNL
    const updates = openOptions.map(option => {
      const snapshot = snapshots.find((s: any) => 
        s.basic.security.code === (option.futu_code as string).split('.')[1]
      );

      if (!snapshot) return null;

      const currentPrice = toNumber(snapshot.basic.curPrice || snapshot.basic.lastPrice);
      
      // We need the full OptionWithTrades to use calculateOptionPNL
      // But getOptionsWithSummary already has trades in it (as json_agg)
      const pnlSummary = calculateOptionPNL(option as any, (option as any).trades, currentPrice);

      return {
        optionId: option.id,
        futuCode: option.futu_code,
        currentPrice,
        unrealizedPNL: pnlSummary.unrealizedPNL,
        netPNL: pnlSummary.netPNL,
        returnPercentage: pnlSummary.returnPercentage
      };
    }).filter(u => u !== null);

    return NextResponse.json({ updates });
  } catch (error: any) {
    console.error('Error refreshing PNL:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to refresh PNL' },
      { status: 500 }
    );
  }
}
