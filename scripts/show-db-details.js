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
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function showDatabaseDetails() {
  try {
    console.log('='.repeat(80));
    console.log('DATABASE OVERVIEW');
    console.log('='.repeat(80));
    console.log();

    // 1. All tables
    console.log('📊 TABLES:');
    const tables = await pool.query(`
      SELECT table_name, table_type
      FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);
    tables.rows.forEach(t => {
      console.log(`  • ${t.table_name} (${t.table_type})`);
    });
    console.log();

    // 2. Table structures
    console.log('📋 TABLE STRUCTURES:');
    console.log('-'.repeat(80));
    
    for (const table of tables.rows.filter(t => t.table_type === 'BASE TABLE')) {
      const tableName = table.table_name;
      console.log(`\n${tableName.toUpperCase()}:`);
      
      const columns = await pool.query(`
        SELECT 
          column_name,
          data_type,
          character_maximum_length,
          is_nullable,
          column_default,
          ordinal_position
        FROM information_schema.columns
        WHERE table_name = $1
        ORDER BY ordinal_position
      `, [tableName]);
      
      columns.rows.forEach(col => {
        const nullable = col.is_nullable === 'YES' ? 'nullable' : 'NOT NULL';
        const defaultVal = col.column_default ? ` DEFAULT ${col.column_default}` : '';
        const length = col.character_maximum_length ? `(${col.character_maximum_length})` : '';
        console.log(`  ${col.ordinal_position}. ${col.column_name}: ${col.data_type}${length} ${nullable}${defaultVal}`);
      });
      
      // Foreign keys
      const fks = await pool.query(`
        SELECT
          kcu.column_name,
          ccu.table_name AS foreign_table_name,
          ccu.column_name AS foreign_column_name
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
        JOIN information_schema.constraint_column_usage ccu ON ccu.constraint_name = tc.constraint_name
        WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_name = $1
      `, [tableName]);
      
      if (fks.rows.length > 0) {
        console.log('  Foreign Keys:');
        fks.rows.forEach(fk => {
          console.log(`    • ${fk.column_name} → ${fk.foreign_table_name}.${fk.foreign_column_name}`);
        });
      }
      
      // Indexes
      const indexes = await pool.query(`
        SELECT indexname, indexdef
        FROM pg_indexes
        WHERE tablename = $1
      `, [tableName]);
      
      if (indexes.rows.length > 0) {
        console.log('  Indexes:');
        indexes.rows.forEach(idx => {
          console.log(`    • ${idx.indexname}`);
        });
      }
      
      // Row count
      const count = await pool.query(`SELECT COUNT(*) as count FROM ${tableName}`);
      console.log(`  Rows: ${count.rows[0].count}`);
    }

    // 3. Sample data
    console.log('\n\n📝 SAMPLE DATA:');
    console.log('-'.repeat(80));
    
    for (const table of tables.rows.filter(t => t.table_type === 'BASE TABLE')) {
      const tableName = table.table_name;
      const sample = await pool.query(`SELECT * FROM ${tableName} LIMIT 3`);
      
      if (sample.rows.length > 0) {
        console.log(`\n${tableName.toUpperCase()} (showing ${sample.rows.length} of ${(await pool.query(`SELECT COUNT(*) FROM ${tableName}`)).rows[0].count}):`);
        sample.rows.forEach((row, idx) => {
          console.log(`  Row ${idx + 1}:`, JSON.stringify(row, null, 2).split('\n').map(l => '    ' + l).join('\n'));
        });
      } else {
        console.log(`\n${tableName.toUpperCase()}: (empty)`);
      }
    }

    // 4. Database size
    console.log('\n\n💾 DATABASE SIZE:');
    console.log('-'.repeat(80));
    const sizes = await pool.query(`
      SELECT
        tablename,
        pg_size_pretty(pg_total_relation_size('public.' || tablename)) AS total_size,
        pg_size_pretty(pg_relation_size('public.' || tablename)) AS table_size
      FROM pg_tables
      WHERE schemaname = 'public'
      ORDER BY pg_total_relation_size('public.' || tablename) DESC
    `);
    sizes.rows.forEach(s => {
      console.log(`  ${s.tablename}: ${s.total_size} (table: ${s.table_size})`);
    });

    console.log('\n' + '='.repeat(80));
    console.log('✅ Database overview complete!');
    console.log('='.repeat(80));

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  } finally {
    await pool.end();
  }
}

showDatabaseDetails();

