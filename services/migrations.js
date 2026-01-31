/**
 * Automatic Database Migration Service
 * Runs migrations automatically on server startup
 */

import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import pool from '../config/database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

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
  'add_cronjobs_table.sql',                      // cronjobs table for scheduled article creation
];

/**
 * Check if a table exists
 */
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
    console.error(`[Migrations] Error checking table ${tableName}:`, error);
    return false;
  }
}

/**
 * Check if a column exists in a table
 */
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
    console.error(`[Migrations] Error checking column ${tableName}.${columnName}:`, error);
    return false;
  }
}

/**
 * Run a single migration file
 */
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
          console.log(`[Migrations] ⏭️  Skipping ${filename} - table ${tableName} already exists`);
          return false;
        }
      }
    }
    
    // Skip column additions if columns already exist
    if (filename === 'add_gif_position.sql') {
      if (await checkColumnExists('gif_commands', 'position_x') && 
          await checkColumnExists('gif_commands', 'position_y')) {
        console.log(`[Migrations] ⏭️  Skipping ${filename} - columns already exist`);
        return false;
      }
    }
    
    if (filename === 'add_gif_size.sql') {
      if (await checkColumnExists('gif_commands', 'size')) {
        console.log(`[Migrations] ⏭️  Skipping ${filename} - column already exists`);
        return false;
      }
    }
    
    // Special handling for cronjobs table
    if (filename === 'add_cronjobs_table.sql') {
      if (await checkTableExists('cronjobs')) {
        console.log(`[Migrations] ⏭️  Skipping ${filename} - table cronjobs already exists`);
        return false;
      }
    }
    
    await pool.query(sql);
    console.log(`[Migrations] ✅ Applied ${filename}`);
    return true;
  } catch (error) {
    // If error is about table/column already existing, that's okay
    if (error.message.includes('already exists') || 
        error.message.includes('duplicate') ||
        (error.message.includes('relation') && error.message.includes('already exists'))) {
      console.log(`[Migrations] ⏭️  Skipping ${filename} - already applied`);
      return false;
    }
    throw error;
  }
}

/**
 * Run all pending migrations
 */
export async function runMigrations() {
  console.log('[Migrations] 🚀 Starting automatic database migrations...\n');
  
  try {
    // Test database connection first
    await pool.query('SELECT 1');
    console.log('[Migrations] ✅ Database connection successful');
    
    let appliedCount = 0;
    let skippedCount = 0;
    
    // Run migrations in order
    for (const migration of MIGRATIONS) {
      try {
        const applied = await runMigration(migration);
        if (applied) {
          appliedCount++;
        } else {
          skippedCount++;
        }
      } catch (error) {
        console.error(`[Migrations] ❌ Error applying ${migration}:`, error.message);
        // Continue with other migrations - don't fail completely
        skippedCount++;
      }
    }
    
    console.log(`\n[Migrations] 📊 Summary: ${appliedCount} applied, ${skippedCount} skipped`);
    console.log('[Migrations] ✅ Migrations complete!\n');
    
    return { applied: appliedCount, skipped: skippedCount };
  } catch (error) {
    console.error('[Migrations] ❌ Migration process failed:', error);
    // Don't throw - allow server to start even if migrations fail
    // The server can still run, migrations will be retried on next startup
    return { applied: 0, skipped: 0, error: error.message };
  }
}
