import postgres from 'postgres';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const connectionString = process.env.DATABASE_URL!;
const client = postgres(connectionString);

async function run() {
  try {
    await client`ALTER TABLE "trades" ADD COLUMN IF NOT EXISTS "margin_percent" numeric`;
    console.log('✅ Added margin_percent column');
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await client.end();
  }
}

run();
