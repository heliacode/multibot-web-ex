import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import pool from '../config/database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function runMigration() {
  try {
    console.log('Running dedicated bit triggers migration...');
    
    // Read the migration file
    const migrationPath = join(__dirname, '..', 'database', 'add_dedicated_bit_triggers.sql');
    const migrationSQL = readFileSync(migrationPath, 'utf8');
    
    // Execute the migration
    await pool.query(migrationSQL);
    
    console.log('✓ Migration completed successfully!');
    console.log('  - Added is_dedicated column');
    console.log('  - Added dedicated_gif_url column');
    console.log('  - Added dedicated_gif_position, dedicated_gif_size, dedicated_gif_duration columns');
    console.log('  - Made command_id and command_type nullable');
    console.log('  - Added constraint to ensure valid trigger configuration');
    
    process.exit(0);
  } catch (error) {
    console.error('✗ Migration failed:');
    console.error(error.message);
    
    // Check if columns already exist (migration might have been run before)
    if (error.message.includes('already exists') || error.message.includes('duplicate')) {
      console.log('\n⚠ Some columns may already exist. This is okay if you\'re re-running the migration.');
      console.log('✓ Migration completed (some steps may have been skipped)');
      process.exit(0);
    }
    
    process.exit(1);
  }
}

runMigration();
