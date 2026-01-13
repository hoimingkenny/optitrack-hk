import 'dotenv/config';
import { getQuote, getSecurityKL, getSnapshots } from '../utils/futu/client';

async function main() {
  const klSymbols = ['00016', 'HK.00016', '00016.HK', 'HK.00700'];
  const snapshotSymbols = ['00016', 'HK.00016', '00016.HK', 'HK.00700'];

  console.log('[debug-futu-bodies] Snapshot request body:');
  console.log(JSON.stringify({ symbols: snapshotSymbols }, null, 2));
  const snaps = await getSnapshots(snapshotSymbols);
  console.log(`[debug-futu-bodies] Snapshot returned: ${snaps.length}`);
  for (const s of snaps.slice(0, 5) as any[]) {
    const market = s?.basic?.security?.market;
    const code = s?.basic?.security?.code;
    const name = s?.basic?.name;
    console.log(`[debug-futu-bodies] snapshot: market=${market} code=${code} name=${name}`);
  }

  for (const symbol of klSymbols) {
    console.log('[debug-futu-bodies] KL request input symbol:', symbol);
    const candles = await getSecurityKL(symbol, 2, 1, 5);
    console.log(`[debug-futu-bodies] KL returned: ${candles.length}`);
    if (candles.length > 0) {
      console.log('[debug-futu-bodies] last candle:', candles[candles.length - 1]);
    }
  }

  const quoteSymbols = ['00016', 'HK.00016', '00016.HK'];
  for (const symbol of quoteSymbols) {
    const q = await getQuote(symbol);
    const market = q?.basic?.security?.market;
    const code = q?.basic?.security?.code;
    const name = q?.basic?.name;
    const cur = q?.basic?.curPrice ?? q?.basic?.lastPrice;
    console.log(`[debug-futu-bodies] quote: symbol=${symbol} market=${market} code=${code} name=${name} price=${cur}`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('[debug-futu-bodies] failed:', err);
    process.exit(1);
  });
