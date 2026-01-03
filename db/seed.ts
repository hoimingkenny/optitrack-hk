import * as dotenv from 'dotenv';
import { resolve } from 'path';

// Load .env.local before any other imports that might use environment variables
dotenv.config({ path: resolve(process.cwd(), '.env.local') });

// Strip quotes from DATABASE_URL if present (common in .env files)
if (process.env.DATABASE_URL) {
  process.env.DATABASE_URL = process.env.DATABASE_URL.replace(/^"(.*)"$/, '$1');
}

async function main() {
  console.log('🌱 Starting database seeding...');
  console.log('✅ Database seeded successfully (nothing to seed)!');
  process.exit(0);
}

main();
