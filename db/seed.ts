import * as dotenv from 'dotenv';
import { resolve } from 'path';

// Load .env.local before any other imports that might use environment variables
dotenv.config({ path: resolve(process.cwd(), '.env.local') });

// Strip quotes from DATABASE_URL if present (common in .env files)
if (process.env.DATABASE_URL) {
  process.env.DATABASE_URL = process.env.DATABASE_URL.replace(/^"(.*)"$/, '$1');
}

async function main() {
  // Use dynamic imports to ensure database client is initialized AFTER env vars are loaded
  const { db } = await import('./index');
  const { stocks } = await import('./schema');
  const { sql } = await import('drizzle-orm');

  console.log('🌱 Starting database seeding...');

  const rawData = [
    { name: 'AIA', symbol: '1299.HK', shares: '1,000' },
    { name: 'Hong Kong Exchanges & Clearing', symbol: '0388.HK', shares: '100' },
    { name: 'Bank of China (Hong Kong)', symbol: '2388.HK', shares: '500' },
    { name: 'Hang Seng Bank', symbol: '0011.HK', shares: '100' },
    { name: 'Sun Hung Kai Properties', symbol: '0016.HK', shares: '1,000' },
    { name: 'China Unicom', symbol: '0762.HK', shares: '2,000' },
    { name: 'Swire Pacific', symbol: '0019.HK', shares: '500' },
    { name: 'CK Hutchison Holdings', symbol: '0001.HK', shares: '500' },
    { name: 'China Resources Land', symbol: '1109.HK', shares: '2,000' },
    { name: 'MTR Corporation', symbol: '0066.HK', shares: '500' },
    { name: 'CLP Group', symbol: '0002.HK', shares: '500' },
    { name: 'Galaxy Entertainment', symbol: '0027.HK', shares: '1,000' },
    { name: 'Techtronic Industries', symbol: '0669.HK', shares: 'N/A' },
    { name: 'CK Infrastructure', symbol: '1038.HK', shares: 'N/A' },
    { name: 'CK Asset Holdings', symbol: '1113.HK', shares: '1,000' },
    { name: 'Henderson Land Development', symbol: '0012.HK', shares: '1,000' },
    { name: 'China Overseas Land & Investment', symbol: '0688.HK', shares: '2,000' },
    { name: 'Hong Kong and China Gas', symbol: '0003.HK', shares: '1,000' },
    { name: 'Chow Tai Fook', symbol: '1929.HK', shares: 'N/A' },
    { name: 'Swire Properties', symbol: '1972.HK', shares: 'N/A' },
  ];

  const formattedData = rawData.map((item) => {
    // Clean shares per contract: remove commas, handle N/A as 500 (standard HKEX lot)
    const cleanShares = item.shares === 'N/A' 
      ? 500 
      : parseInt(item.shares.replace(/,/g, ''), 10);

    return {
      name: item.name,
      symbol: item.symbol,
      shares_per_contract: cleanShares,
    };
  });

  try {
    console.log(`Inserting/Updating ${formattedData.length} stocks...`);

    // Bulk upsert using Drizzle
    await db.insert(stocks)
      .values(formattedData)
      .onConflictDoUpdate({
        target: stocks.symbol,
        set: {
          name: sql`excluded.name`,
          shares_per_contract: sql`excluded.shares_per_contract`,
          updated_at: new Date(),
        },
      });

    console.log('✅ Database seeded successfully!');
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

main();
