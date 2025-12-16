import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pool from '../config/database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runMigration() {
  try {
    const migrationFile = path.join(__dirname, '../database/add_bits_only_flag.sql');
    const sql = fs.readFileSync(migrationFile, 'utf8');
    
    console.log('Running migration: add_bits_only_flag.sql');
    await pool.query(sql);
    
    console.log('Migration completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

runMigration();
