import pg from 'pg';
import dotenv from 'dotenv';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

dotenv.config();

const { Pool } = pg;
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://localhost:5432/multibot',
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function checkTables() {
  try {
    const result = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `);
    return result.rows.map(row => row.table_name);
  } catch (error) {
    console.error('Error checking tables:', error.message);
    throw error;
  }
}

async function initializeDatabase() {
  try {
    console.log('Checking database connection...');
    await pool.query('SELECT 1');
    console.log('✓ Database connection successful');

    const tables = await checkTables();
    console.log(`Found ${tables.length} tables: ${tables.join(', ') || 'None'}`);

    const requiredTables = ['users', 'audio_commands', 'obs_tokens'];
    const missingTables = requiredTables.filter(table => !tables.includes(table));

    if (missingTables.length > 0) {
      console.log(`\nMissing tables: ${missingTables.join(', ')}`);
      console.log('Initializing database schema...');
      
      const schemaPath = join(__dirname, '..', 'database', 'schema.sql');
      const schema = readFileSync(schemaPath, 'utf8');
      
      await pool.query(schema);
      console.log('✓ Database schema initialized successfully');
      
      const newTables = await checkTables();
      console.log(`\nTables after initialization: ${newTables.join(', ')}`);
    } else {
      console.log('✓ All required tables exist');
    }

    // Check if there are any users
    const userCount = await pool.query('SELECT COUNT(*) FROM users');
    console.log(`\nUsers in database: ${userCount.rows[0].count}`);
    
    if (userCount.rows[0].count === '0') {
      console.log('⚠ No users found. You may need to log in again to create your user account.');
    }

    console.log('\n✓ Database is ready!');
  } catch (error) {
    console.error('\n✗ Database initialization failed:');
    console.error('Error:', error.message);
    
    if (error.message.includes('password') || error.message.includes('authentication')) {
      console.error('\nTip: Check your DATABASE_URL in .env file.');
      console.error('Format: postgresql://username:password@localhost:5432/database_name');
    } else if (error.message.includes('does not exist')) {
      console.error('\nTip: The database might not exist. Create it with:');
      console.error('  createdb multibot');
    } else if (error.message.includes('ECONNREFUSED')) {
      console.error('\nTip: PostgreSQL might not be running. Start it with:');
      console.error('  On Windows: Start PostgreSQL service');
      console.error('  On Linux/Mac: sudo service postgresql start');
    }
    
    process.exit(1);
  } finally {
    await pool.end();
  }
}

initializeDatabase();

