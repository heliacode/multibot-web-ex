import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

// Validate DATABASE_URL
if (!process.env.DATABASE_URL) {
  console.error('[DB CONFIG] ❌ DATABASE_URL is not set');
  if (process.env.NODE_ENV === 'production') {
    throw new Error('DATABASE_URL is required in production. Please set it in Railway environment variables.');
  }
  console.warn('[DB CONFIG] ⚠️  DATABASE_URL not set - database features will not work');
}

// Check if pointing to localhost (common mistake)
if (process.env.DATABASE_URL) {
  const dbUrl = process.env.DATABASE_URL;
  if ((dbUrl.includes('localhost') || dbUrl.includes('127.0.0.1') || dbUrl.includes('::1')) && process.env.NODE_ENV === 'production') {
    console.error('[DB CONFIG] ❌ DATABASE_URL points to localhost in production:', dbUrl.replace(/:[^:@]+@/, ':****@'));
    console.error('[DB CONFIG]    Railway Postgres should provide a remote database URL');
    throw new Error('DATABASE_URL cannot point to localhost in production. Check Railway Postgres plugin connection variables.');
  }
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Helper function for querying (used by some models)
export async function query(text, params) {
  return pool.query(text, params);
}

export default pool;

