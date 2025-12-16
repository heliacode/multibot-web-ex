import pool from '../config/database.js';

async function checkColumns() {
  try {
    // Check if columns exist
    const columnsResult = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'gif_commands' 
      ORDER BY ordinal_position
    `);
    
    console.log('gif_commands columns:');
    columnsResult.rows.forEach(r => {
      console.log(`  ${r.column_name}: ${r.data_type}`);
    });
    
    // Check sample data
    const dataResult = await pool.query(`
      SELECT id, command, position, size 
      FROM gif_commands 
      LIMIT 3
    `);
    
    console.log('\nSample gif_commands:');
    dataResult.rows.forEach(r => {
      console.log(`  ID ${r.id}: ${r.command} - position: ${r.position || 'NULL'}, size: ${r.size || 'NULL'}`);
    });
    
    await pool.end();
  } catch (error) {
    console.error('Error:', error.message);
    await pool.end();
    process.exit(1);
  }
}

checkColumns();

