import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

// Common PostgreSQL connection strings to try
const connectionStrings = [
  process.env.DATABASE_URL,
  'postgresql://postgres:postgres@localhost:5432/multibot',
  'postgresql://postgres@localhost:5432/multibot',
  'postgresql://localhost:5432/multibot?user=postgres'
];

async function testConnection(connectionString, label) {
  const pool = new Pool({
    connectionString: connectionString,
    ssl: false
  });

  try {
    await pool.query('SELECT 1');
    const tables = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `);
    console.log(`✓ ${label}: Connected successfully`);
    console.log(`  Tables: ${tables.rows.map(r => r.table_name).join(', ') || 'None'}`);
    await pool.end();
    return true;
  } catch (error) {
    console.log(`✗ ${label}: ${error.message}`);
    await pool.end();
    return false;
  }
}

console.log('Testing database connections...\n');

for (const connStr of connectionStrings.filter(Boolean)) {
  const label = connStr === process.env.DATABASE_URL ? 'Current DATABASE_URL' : 'Alternative';
  await testConnection(connStr, label);
}

