import { OptionWithTrades } from '@/db/schema';
import globalClient, { toNumber } from '@/utils/futu/client';
import { calculateOptionPNL } from '@/utils/helpers/option-calculator';

/**
 * Fetches live prices for open options and recalculates PnL
 */
export async function populateLivePrices(options: OptionWithTrades[]): Promise<OptionWithTrades[]> {
  const openOptions = options.filter(o => o.status === 'Open' && o.futu_code);
  
  if (openOptions.length === 0) {
    return options;
  }

  // Prepare codes for Futu snapshot
  const codes = openOptions.map(o => {
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

  try {
    // Fetch snapshots from Futu
    const snapshots = await globalClient.getSecuritySnapshots(codes);
    
    if (!snapshots || snapshots.length === 0) {
        return options;
    }

    // Map snapshots back to options and recalculate PNL
    return options.map((option) => {
      if (option.status !== 'Open' || !option.futu_code) {
        return option;
      }

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

      if (!snapshot) return option;

      const currentPrice = toNumber(snapshot.basic.curPrice || snapshot.basic.lastPrice);
      
      // Calculate PNL using the trades we fetched
      const pnlSummary = calculateOptionPNL(option as any, option.trades, currentPrice);

      return {
        ...option,
        summary: pnlSummary
      };
    });
  } catch (error) {
    console.error('Error fetching live prices:', error);
    // Return original options on error
    return options;
  }
}
