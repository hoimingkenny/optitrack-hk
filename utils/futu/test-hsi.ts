import globalClient, { toNumber } from './client';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function testHSI() {
  try {
    console.log('Connecting to Futu...');
    await globalClient.connect();
    
    const hsiSymbol = 'HK.800000';
    console.log('Fetching snapshot for ' + hsiSymbol + '...');
    
    const snapshots = await globalClient.getSecuritySnapshots([{ market: 1, code: '800000' }]);
    
    if (snapshots && snapshots.length > 0) {
      const hsi = snapshots[0];
      console.log('Raw HSI Snapshot:', JSON.stringify(hsi, null, 2));
    } else {
      console.log('No snapshot found for HSI');
    }
  } catch (err) {
    console.error('Error:', err);
  } finally {
    process.exit();
  }
}

testHSI();
