
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const connectionString = process.env.DATABASE_URL!;
const client = postgres(connectionString);
const db = drizzle(client);

async function resetDb() {
  console.log('🗑️  Cleaning database...');
  
  try {
    // Drop tables in correct order (child first)
    await client`DROP TABLE IF EXISTS "trades" CASCADE`;
    await client`DROP TABLE IF EXISTS "options" CASCADE`;
    await client`DROP TABLE IF EXISTS "stocks" CASCADE`;
    
    // Drop drizzle schema to reset migration history
    await client`DROP SCHEMA IF EXISTS "drizzle" CASCADE`;
    
    console.log('✅ Database cleaned successfully');
  } catch (error) {
    console.error('❌ Error cleaning database:', error);
  } finally {
    await client.end();
  }
}

resetDb();
