
import 'dotenv/config';
import { getSecurityKL } from '../utils/futu/client';

async function main() {
  // Get symbol from command line args or default
  const args = process.argv.slice(2);
  const symbols = args.length > 0 ? args : ['HK.00700'];

  for (const symbol of symbols) {
    console.log(`[Script] Processing: ${symbol}`);
    
    try {
      // This function now includes auto-subscription logic
      // We request a small limit just to trigger the subscription and verify data flow
      const data = await getSecurityKL(symbol, 2, 1, 10); 
      
      console.log(`[Script] Successfully subscribed and fetched K-Line data for ${symbol}.`);
      console.log(`[Script] Received ${data.length} records.`);
      
      if (data.length > 0) {
        console.log(`[Script] Latest candle for ${symbol}:`, data[data.length - 1]);
      } else {
        console.log(`[Script] Warning: Subscription successful but no data returned for ${symbol}.`);
      }
      
    } catch (error: any) {
      console.error(`[Script] Failed to subscribe/fetch for ${symbol}:`, error.message || error);
    }
    console.log('---');
  }
  
  console.log('[Script] All Done.');
  process.exit(0);
}

main();
