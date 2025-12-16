/**
 * Fix audio commands that have ! prefix
 */

import pool from '../config/database.js';

async function fixAudioCommands() {
  console.log('🔧 Fixing audio commands with ! prefix...\n');
  
  try {
    // Find all audio commands with ! prefix
    const result = await pool.query(
      "SELECT id, command FROM audio_commands WHERE command LIKE '!%'"
    );
    
    console.log(`Found ${result.rows.length} audio commands with ! prefix`);
    
    if (result.rows.length === 0) {
      console.log('✅ No commands to fix');
      await pool.end();
      return;
    }
    
    // Fix each command
    for (const row of result.rows) {
      const newCommand = row.command.replace(/^!/, '');
      await pool.query(
        'UPDATE audio_commands SET command = $1 WHERE id = $2',
        [newCommand, row.id]
      );
      console.log(`   Fixed: "${row.command}" -> "${newCommand}"`);
    }
    
    console.log(`\n✅ Fixed ${result.rows.length} audio commands`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

fixAudioCommands();

