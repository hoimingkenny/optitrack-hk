import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getOptionsWithSummary, getOpenOptionsWithTrades } from '@/db/repositories/options';
import { OptionWithTrades } from '@/db/schema';
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

    // 1. Get all open options for the user with trades
    const openOptions = await getOpenOptionsWithTrades(user.id);
    const validOptions = openOptions.filter(o => o.futu_code);

    if (validOptions.length === 0) {
      return NextResponse.json({ updates: [] });
    }

    // 2. Prepare codes for Futu snapshot
    const codes = validOptions.map(o => {
      let futuCode = o.futu_code as string;
      
      // Ensure market prefix if missing
      if (!futuCode.includes('.')) {
        if (o.stock_symbol.includes('HK') || /^\d+$/.test(o.stock_symbol)) {
          futuCode = `HK.${futuCode}`;
        } else if (o.stock_symbol.includes('US')) {
          futuCode = `US.${futuCode}`;
        }
      }

      const [market, code] = futuCode.split('.');
      return {
        market: market === 'HK' ? 1 : 2, // 1 for HK, 2 for US
        code: code
      };
    });

    // 3. Fetch snapshots from Futu
    const snapshots = await globalClient.getSecuritySnapshots(codes);
    
    // 4. Map snapshots back to options and recalculate PNL
    const updates = validOptions.map((option: OptionWithTrades) => {
      // Reconstruct the code logic to match snapshot
      let futuCode = option.futu_code as string;
      if (!futuCode.includes('.')) {
        if (option.stock_symbol.includes('HK') || /^\d+$/.test(option.stock_symbol)) {
          futuCode = `HK.${futuCode}`;
        } else if (option.stock_symbol.includes('US')) {
          futuCode = `US.${futuCode}`;
        }
      }
      const codeWithoutMarket = futuCode.split('.')[1];

      const snapshot = snapshots.find((s: any) => 
        s.basic.security.code === codeWithoutMarket
      );

      if (!snapshot) return null;

      const currentPrice = toNumber(snapshot.basic.curPrice || snapshot.basic.lastPrice);
      
      // Calculate PNL using the trades we fetched
      const pnlSummary = calculateOptionPNL(option as any, option.trades, currentPrice);

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
