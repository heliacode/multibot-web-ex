import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function verifyDatabase() {
  try {
    console.log('🔍 Verifying database structure...\n');
    
    // Check connection
    await pool.query('SELECT 1');
    console.log('✓ Database connection successful\n');
    
    // Get all tables
    const tablesResult = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `);
    const tables = tablesResult.rows.map(row => row.table_name);
    console.log(`📊 Found ${tables.length} tables: ${tables.join(', ')}\n`);
    
    // Check required tables
    const requiredTables = ['users', 'audio_commands', 'obs_tokens', 'user_images'];
    const missingTables = requiredTables.filter(table => !tables.includes(table));
    
    if (missingTables.length > 0) {
      console.log('❌ Missing tables:', missingTables.join(', '));
      return false;
    } else {
      console.log('✓ All required tables exist\n');
    }
    
    // Check user_images table structure
    console.log('📋 Checking user_images table structure...');
    const columnsResult = await pool.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'user_images'
      ORDER BY ordinal_position
    `);
    
    console.log('\nColumns in user_images table:');
    columnsResult.rows.forEach(col => {
      console.log(`  - ${col.column_name}: ${col.data_type} ${col.is_nullable === 'NO' ? '(NOT NULL)' : '(nullable)'} ${col.column_default ? `DEFAULT: ${col.column_default}` : ''}`);
    });
    
    // Check indexes
    console.log('\n📇 Checking indexes...');
    const indexesResult = await pool.query(`
      SELECT indexname, indexdef
      FROM pg_indexes
      WHERE tablename = 'user_images'
    `);
    
    if (indexesResult.rows.length > 0) {
      indexesResult.rows.forEach(idx => {
        console.log(`  ✓ ${idx.indexname}`);
      });
    } else {
      console.log('  ⚠ No indexes found');
    }
    
    // Check foreign keys
    console.log('\n🔗 Checking foreign keys...');
    const fkResult = await pool.query(`
      SELECT
        tc.constraint_name,
        tc.table_name,
        kcu.column_name,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name
      FROM information_schema.table_constraints AS tc
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
      JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
      WHERE tc.constraint_type = 'FOREIGN KEY'
        AND tc.table_name = 'user_images'
    `);
    
    if (fkResult.rows.length > 0) {
      fkResult.rows.forEach(fk => {
        console.log(`  ✓ ${fk.column_name} → ${fk.foreign_table_name}.${fk.foreign_column_name}`);
      });
    } else {
      console.log('  ⚠ No foreign keys found');
    }
    
    // Check triggers
    console.log('\n⚡ Checking triggers...');
    const triggersResult = await pool.query(`
      SELECT trigger_name, event_manipulation, event_object_table
      FROM information_schema.triggers
      WHERE event_object_table = 'user_images'
    `);
    
    if (triggersResult.rows.length > 0) {
      triggersResult.rows.forEach(trigger => {
        console.log(`  ✓ ${trigger.trigger_name} (${trigger.event_manipulation})`);
      });
    } else {
      console.log('  ⚠ No triggers found');
    }
    
    // Check row counts
    console.log('\n📊 Table row counts:');
    for (const table of requiredTables) {
      try {
        const countResult = await pool.query(`SELECT COUNT(*) as count FROM ${table}`);
        console.log(`  ${table}: ${countResult.rows[0].count} rows`);
      } catch (error) {
        console.log(`  ${table}: Error - ${error.message}`);
      }
    }
    
    // Check sample user_images data structure (if any exist)
    const sampleResult = await pool.query(`
      SELECT * FROM user_images LIMIT 1
    `);
    
    if (sampleResult.rows.length > 0) {
      console.log('\n📝 Sample user_images row structure:');
      console.log(JSON.stringify(sampleResult.rows[0], null, 2));
    } else {
      console.log('\n📝 No data in user_images table yet (this is normal for a new setup)');
    }
    
    console.log('\n✅ Database verification complete!');
    return true;
    
  } catch (error) {
    console.error('\n❌ Database verification failed:');
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);
    return false;
  } finally {
    await pool.end();
  }
}

verifyDatabase().then(success => {
  process.exit(success ? 0 : 1);
});

