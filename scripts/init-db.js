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

    const requiredTables = ['users', 'audio_commands', 'obs_tokens', 'user_images', 'design_elements', 'gif_commands'];
    const missingTables = requiredTables.filter(table => !tables.includes(table));

    if (missingTables.length > 0) {
      console.log(`\nMissing tables: ${missingTables.join(', ')}`);
      
      // Check if we need to run the full schema (for new databases)
      const coreTables = ['users', 'audio_commands', 'obs_tokens'];
      const missingCoreTables = coreTables.filter(table => !tables.includes(table));
      
      if (missingCoreTables.length > 0) {
        console.log('Initializing main database schema...');
        const schemaPath = join(__dirname, '..', 'database', 'schema.sql');
        const schema = readFileSync(schemaPath, 'utf8');
        await pool.query(schema);
        console.log('✓ Main database schema initialized');
      }
      
      // Run user_images table migration if needed
      if (missingTables.includes('user_images')) {
        console.log('Adding user_images table...');
        const imagesTablePath = join(__dirname, '..', 'database', 'add_images_table.sql');
        const imagesTable = readFileSync(imagesTablePath, 'utf8');
        await pool.query(imagesTable);
        console.log('✓ user_images table created');
      }
      
      // Run design_elements table migration if needed
      if (missingTables.includes('design_elements')) {
        console.log('Adding design_elements table...');
        const designTablePath = join(__dirname, '..', 'database', 'add_design_elements_table.sql');
        const designTable = readFileSync(designTablePath, 'utf8');
        await pool.query(designTable);
        console.log('✓ design_elements table created');
      }
      
      // Run gif_commands table migration if needed
      if (missingTables.includes('gif_commands')) {
        console.log('Adding gif_commands table...');
        const gifTablePath = join(__dirname, '..', 'database', 'add_gif_commands_table.sql');
        const gifTable = readFileSync(gifTablePath, 'utf8');
        await pool.query(gifTable);
        console.log('✓ gif_commands table created');
      }
      
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

