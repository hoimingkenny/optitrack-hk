import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

// Connection string from environment
const connectionString = process.env.DATABASE_URL!;

// Create postgres connection
// Use connection pooling for serverless environments
const client = postgres(connectionString, {
  prepare: false, // Disable prepared statements for serverless
  max: 1, // Limit connections in serverless
});

// Create drizzle database instance
export const db = drizzle(client, { schema });

// Export schema for convenience
export * from './schema';
