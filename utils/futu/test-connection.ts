/// <reference path="./futu-api.d.ts" />
import globalClient, { FutuClient } from './client';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { Qot_Common } from 'futu-api/proto.js';

// Explicitly load .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function testConnection() {
  console.log('--- Futu Connection Test ---');
  
  try {
    console.log('Connecting via globalClient...');
    await globalClient.connect();
    console.log('✅ Success: Connected to Futu OpenD');

    // console.log('Testing getSecuritySnapshot for HK.00700 (Tencent)...');
    // const snapshot = await globalClient.getSecuritySnapshot(Qot_Common.QotMarket.QotMarket_HK_Security, '00700');
    // console.log('✅ Success: Received snapshot');

    console.log('Testing getOptionExpirationDates for HK.00700 (Tencent)...');
    const expirationDates = await globalClient.getOptionExpirationDates(Qot_Common.QotMarket.QotMarket_HK_Security, '00700');
    console.log('✅ Success: Received expiration dates');
    console.log(`Found ${expirationDates.length} expiration dates:`);
    expirationDates.slice(0, 5).forEach(d => {
      console.log(`  - ${d.strikeTime} (Distance: ${d.optionExpiryDateDistance})`);
    });

    if (expirationDates.length > 0) {
      const firstExpiry = expirationDates[0].strikeTime;
      console.log(`\nTesting getOptionChain for HK.00700 at ${firstExpiry}...`);
      const chain = await globalClient.getOptionChain(
        Qot_Common.QotMarket.QotMarket_HK_Security, 
        '00700', 
        firstExpiry, 
        firstExpiry
      );
      console.log(`✅ Success: Received option chain`);
      console.log(`Found ${chain.length} options:`);
      // Show 3 calls and 3 puts with premium
      const calls = chain.filter(o => o.optionType === 1).slice(0, 5);
      const puts = chain.filter(o => o.optionType === 2).slice(0, 5);
      
      const allTestOptions = [...calls, ...puts];
      console.log(`\nFetching snapshots for ${allTestOptions.length} options to get premiums...`);
      
      const snapshots = await globalClient.getSecuritySnapshots(
        allTestOptions.map(o => ({ market: Qot_Common.QotMarket.QotMarket_HK_Security, code: o.code }))
      );
      
      // Map snapshots back to options
      const snapshotMap = new Map();
      snapshots.forEach((snap: any) => {
        snapshotMap.set(snap.basic.security.code, snap);
      });

      // Debug: print one snapshot structure
      if (snapshots.length > 0) {
        // console.log('DEBUG Snapshot structure:', JSON.stringify(snapshots[0], null, 2));
      }

      console.log('\nCalls with Detailed Data:');
      calls.forEach(o => {
        const snap = snapshotMap.get(o.code);
        const basic = snap?.basic;
        const opt = snap?.optionExData;
        
        console.log(`  - ${o.code}: ${o.name}`);
        console.log(`    Premium: ${basic?.curPrice ?? 'N/A'} | Change: ${basic?.priceChange ?? 0} (${basic?.priceChangeRate ?? 0}%)`);
        console.log(`    Strike: ${o.strikePrice} | IV: ${opt?.impliedVolatility ?? 'N/A'} | OI: ${opt?.openInterest ?? 0}`);
        console.log(`    Delta: ${opt?.delta ?? 'N/A'} | Gamma: ${opt?.gamma ?? 'N/A'} | Theta: ${opt?.theta ?? 'N/A'}`);
        console.log(`    Vol: ${basic?.volume ?? 0} | Bid: ${snap?.orderBook?.bid?.[0]?.price ?? 'N/A'} | Ask: ${snap?.orderBook?.ask?.[0]?.price ?? 'N/A'}`);
      });

      console.log('\nPuts with Detailed Data:');
      puts.forEach(o => {
        const snap = snapshotMap.get(o.code);
        const basic = snap?.basic;
        const opt = snap?.optionExData;
        
        console.log(`  - ${o.code}: ${o.name}`);
        console.log(`    Premium: ${basic?.curPrice ?? 'N/A'} | Change: ${basic?.priceChange ?? 0} (${basic?.priceChangeRate ?? 0}%)`);
        console.log(`    Strike: ${o.strikePrice} | IV: ${opt?.impliedVolatility ?? 'N/A'} | OI: ${opt?.openInterest ?? 0}`);
        console.log(`    Delta: ${opt?.delta ?? 'N/A'} | Gamma: ${opt?.gamma ?? 'N/A'} | Theta: ${opt?.theta ?? 'N/A'}`);
        console.log(`    Vol: ${basic?.volume ?? 0} | Bid: ${snap?.orderBook?.bid?.[0]?.price ?? 'N/A'} | Ask: ${snap?.orderBook?.ask?.[0]?.price ?? 'N/A'}`);
      });
    }

    globalClient.disconnect();
    console.log('Disconnected.');
    return true;
  } catch (err) {
    console.error(`❌ Error: ${err instanceof Error ? err.message : String(err)}`);
    return false;
  }
}

testConnection()
  .then((success) => process.exit(success ? 0 : 1))
  .catch(() => process.exit(1));
