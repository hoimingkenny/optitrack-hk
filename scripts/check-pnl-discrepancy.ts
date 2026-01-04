
import { db } from '@/db';
import { options, trades } from '@/db/schema';
import { getOptionsWithSummary, getOptionById } from '@/db/repositories/options';
import { eq } from 'drizzle-orm';

async function main() {
  // Get a user with options
  const userOption = await db.query.options.findFirst();
  
  if (!userOption) {
    console.log('No options found in DB');
    return;
  }
  
  const userId = userOption.user_id;
  console.log(`Checking options for user: ${userId}`);
  
  // Get summary list
  const optionsList = await getOptionsWithSummary(userId);
  
  console.log(`Found ${optionsList.length} options in summary list`);
  
  for (const optSummary of optionsList) {
    // Get detail for this option
    const optDetail = await getOptionById(optSummary.id, userId);
    
    if (!optDetail) {
      console.error(`Could not find detail for option ${optSummary.id}`);
      continue;
    }
    
    const summaryPNL = optSummary.total_pnl;
    const detailPNL = optDetail.summary.netPNL;
    
    console.log(`Option ${optSummary.stock_symbol} (${optSummary.id}):`);
    console.log(`  Summary PNL: ${summaryPNL}`);
    console.log(`  Detail PNL:  ${detailPNL}`);
    
    if (Math.abs(summaryPNL - detailPNL) > 0.01) {
      console.error('  MISMATCH DETECTED!');
      console.log('  Summary Trades Count:', optSummary.trades_count);
      console.log('  Detail Trades Count:', optDetail.trades.length);
      // console.log('  Detail Trades:', JSON.stringify(optDetail.trades, null, 2));
    } else {
      console.log('  Match OK');
    }
  }
}

main().catch(console.error).finally(() => process.exit());
