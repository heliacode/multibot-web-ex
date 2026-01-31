/**
 * Railway Database Initialization Script
 * 
 * This script initializes the database with all required tables and migrations.
 * It's safe to run multiple times - it checks for existing tables before creating them.
 * 
 * Usage:
 *   - Run manually: node scripts/init-db-railway.js
 *   - Railway will run this automatically if you add it to the build process
 */

import pg from 'pg';
import dotenv from 'dotenv';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

dotenv.config();

const { Pool } = pg;
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Check if DATABASE_URL is set
if (!process.env.DATABASE_URL) {
  console.error('❌ DATABASE_URL environment variable is not set');
  console.error('   Please ensure Railway Postgres plugin is added and connected');
  console.error('   In Railway: Go to your service → Variables → Add DATABASE_URL');
  process.exit(1);
}

// Validate DATABASE_URL is not pointing to localhost (common mistake)
const dbUrl = process.env.DATABASE_URL;
if (dbUrl.includes('localhost') || dbUrl.includes('127.0.0.1') || dbUrl.includes('::1')) {
  console.error('❌ DATABASE_URL appears to point to localhost:', dbUrl.replace(/:[^:@]+@/, ':****@'));
  console.error('   Railway Postgres should provide a remote database URL');
  console.error('   Check Railway → Postgres Plugin → Connection Variables');
  console.error('   The URL should look like: postgresql://user:pass@hostname:5432/dbname');
  process.exit(1);
}

console.log('📋 DATABASE_URL validation:');
console.log('   URL format: ✓ (not localhost)');
console.log('   URL preview:', dbUrl.replace(/:[^:@]+@/, ':****@').substring(0, 50) + '...');

// Database connection with Railway-compatible SSL settings
let pool;
try {
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    connectionTimeoutMillis: 10000, // 10 second timeout
    query_timeout: 30000 // 30 second query timeout
  });
  
  // Handle pool errors
  pool.on('error', (err) => {
    console.error('[DB POOL] Unexpected error on idle client:', err);
  });
} catch (poolError) {
  console.error('❌ Failed to create database pool:', poolError);
  console.error('   Error message:', poolError.message || 'Unknown error');
  console.error('   Error stack:', poolError.stack);
  process.exit(1);
}

// Migration files in order of execution
const MIGRATIONS = [
  'schema.sql',                                    // Core tables: users, audio_commands, obs_tokens
  'add_images_table.sql',                         // user_images table
  'add_design_elements_table.sql',                // design_elements table
  'add_gif_commands_table.sql',                  // gif_commands table
  'add_animated_text_commands_table.sql',         // animated_text_commands table
  'add_bit_triggers_table.sql',                  // bit_triggers table
  'add_gif_position.sql',                        // Add position columns to gif_commands
  'add_gif_size.sql',                            // Add size columns to gif_commands
  'add_animated_text_transitions.sql',           // Add transition columns to animated_text_commands
  'add_animated_text_animate_css.sql',           // Add animate.css support
  'add_bits_only_flag.sql',                      // Add bits_only flag
  'add_dedicated_bit_triggers.sql',              // Update bit_triggers structure
  'remove_large_size.sql',                       // Remove large size option
];

async function checkTableExists(tableName) {
  try {
    const result = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = $1
      )
    `, [tableName]);
    return result.rows[0].exists;
  } catch (error) {
    console.error(`Error checking table ${tableName}:`, error.message);
    return false;
  }
}

async function checkColumnExists(tableName, columnName) {
  try {
    const result = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = $1 
        AND column_name = $2
      )
    `, [tableName, columnName]);
    return result.rows[0].exists;
  } catch (error) {
    return false;
  }
}

async function runMigration(filename) {
  const filePath = join(__dirname, '..', 'database', filename);
  try {
    const sql = readFileSync(filePath, 'utf8');
    
    // Skip if it's a table creation and table already exists
    if (filename.includes('_table.sql')) {
      const tableMatch = filename.match(/add_(\w+)_table\.sql/);
      if (tableMatch) {
        const tableName = tableMatch[1];
        if (await checkTableExists(tableName)) {
          console.log(`  ⏭️  Skipping ${filename} - table ${tableName} already exists`);
          return false;
        }
      }
    }
    
    // Skip column additions if columns already exist
    if (filename === 'add_gif_position.sql') {
      if (await checkColumnExists('gif_commands', 'position_x') && 
          await checkColumnExists('gif_commands', 'position_y')) {
        console.log(`  ⏭️  Skipping ${filename} - columns already exist`);
        return false;
      }
    }
    
    if (filename === 'add_gif_size.sql') {
      if (await checkColumnExists('gif_commands', 'size')) {
        console.log(`  ⏭️  Skipping ${filename} - column already exists`);
        return false;
      }
    }
    
    await pool.query(sql);
    console.log(`  ✅ Applied ${filename}`);
    return true;
  } catch (error) {
    // If error is about table/column already existing, that's okay
    if (error.message.includes('already exists') || 
        error.message.includes('duplicate') ||
        error.message.includes('relation') && error.message.includes('already exists')) {
      console.log(`  ⏭️  Skipping ${filename} - already applied`);
      return false;
    }
    throw error;
  }
}

async function initializeDatabase() {
  console.log('🚀 Railway Database Initialization\n');
  console.log('='.repeat(60));
  
  try {
    // Check if DATABASE_URL is set
    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL environment variable is not set');
    }
    
    console.log('📋 Environment check:');
    console.log(`   DATABASE_URL: ${process.env.DATABASE_URL ? 'Set ✓' : 'Not set ✗'}`);
    console.log(`   NODE_ENV: ${process.env.NODE_ENV || 'not set'}`);
    
    // Test database connection
    console.log('\n1️⃣  Testing database connection...');
    try {
      await pool.query('SELECT 1');
      console.log('   ✅ Database connection successful');
    } catch (connError) {
      console.error('   ❌ Database connection failed:', connError.message || connError);
      console.error('   Error code:', connError.code);
      console.error('   Error detail:', connError.detail);
      throw connError;
    }
    
    // Check if core schema exists
    console.log('\n2️⃣  Checking existing tables...');
    const hasUsers = await checkTableExists('users');
    const hasAudioCommands = await checkTableExists('audio_commands');
    const hasObsTokens = await checkTableExists('obs_tokens');
    
    if (!hasUsers || !hasAudioCommands || !hasObsTokens) {
      console.log('   ⚠️  Core tables missing - will initialize from scratch');
    } else {
      console.log('   ✅ Core tables exist');
    }
    
    // Run migrations
    console.log('\n3️⃣  Running migrations...');
    let appliedCount = 0;
    let skippedCount = 0;
    
    for (const migration of MIGRATIONS) {
      try {
        const applied = await runMigration(migration);
        if (applied) {
          appliedCount++;
        } else {
          skippedCount++;
        }
      } catch (error) {
        console.error(`   ❌ Error applying ${migration}:`, error.message);
        // Continue with other migrations
      }
    }
    
    console.log(`\n   📊 Applied: ${appliedCount}, Skipped: ${skippedCount}`);
    
    // Verify final state
    console.log('\n4️⃣  Verifying database state...');
    const tables = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `);
    
    const tableNames = tables.rows.map(row => row.table_name);
    console.log(`   📋 Found ${tableNames.length} tables: ${tableNames.join(', ')}`);
    
    // Check required tables
    const requiredTables = [
      'users', 
      'audio_commands', 
      'obs_tokens', 
      'user_images', 
      'design_elements', 
      'gif_commands',
      'animated_text_commands',
      'bit_triggers'
    ];
    
    const missingTables = requiredTables.filter(table => !tableNames.includes(table));
    if (missingTables.length > 0) {
      console.log(`   ⚠️  Missing tables: ${missingTables.join(', ')}`);
    } else {
      console.log('   ✅ All required tables exist');
    }
    
    // Check user count
    const userCount = await pool.query('SELECT COUNT(*) FROM users');
    console.log(`\n5️⃣  Database status:`);
    console.log(`   👥 Users: ${userCount.rows[0].count}`);
    
    console.log('\n' + '='.repeat(60));
    console.log('✅ Database initialization complete!');
    console.log('='.repeat(60));
    
    process.exit(0);
  } catch (error) {
    console.error('\n' + '='.repeat(60));
    console.error('❌ Database initialization failed!');
    console.error('='.repeat(60));
    
    // Log all available error properties
    console.error('\nError details:');
    console.error('  Message:', error.message || '(no message)');
    console.error('  Code:', error.code || '(no code)');
    console.error('  Detail:', error.detail || '(no detail)');
    console.error('  Name:', error.name || '(no name)');
    console.error('  Type:', error.constructor?.name || typeof error);
    
    if (error.stack) {
      console.error('\nStack trace:');
      console.error(error.stack);
    }
    
    // Also try to stringify the error
    try {
      console.error('\nFull error object:', JSON.stringify(error, Object.getOwnPropertyNames(error)));
    } catch (e) {
      console.error('\nCould not stringify error object');
    }
    
    if (error.message.includes('password') || error.message.includes('authentication')) {
      console.error('\n💡 Tip: Check your DATABASE_URL environment variable.');
      console.error('   Railway should provide this automatically if you added a Postgres plugin.');
    } else if (error.message.includes('does not exist')) {
      console.error('\n💡 Tip: The database might not exist.');
      console.error('   Railway Postgres plugin creates the database automatically.');
    } else if (error.message.includes('ECONNREFUSED')) {
      console.error('\n💡 Tip: Cannot connect to database.');
      console.error('   Ensure DATABASE_URL is set correctly in Railway.');
    } else if (error.message.includes('ENCRYPTION_KEY')) {
      console.error('\n💡 Tip: Encryption key issue detected.');
      console.error('   Check if ENCRYPTION_KEY is set in Railway environment variables.');
    } else if (!error.message || error.message.trim() === '') {
      console.error('\n💡 Tip: Empty error message - this might be a connection timeout.');
      console.error('   Check if DATABASE_URL is set and the database is accessible.');
    }
    
    // Exit with error code so startup script knows it failed
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run initialization
initializeDatabase();
