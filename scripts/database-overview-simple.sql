-- ============================================
-- Quick Database Overview - Single Query
-- Shows all tables with their structure and row counts
-- ============================================

WITH table_info AS (
    SELECT 
        t.table_name,
        COUNT(DISTINCT c.column_name) AS column_count,
        STRING_AGG(
            c.column_name || ' (' || c.data_type || 
            CASE WHEN c.is_nullable = 'NO' THEN ' NOT NULL' ELSE '' END || ')',
            ', ' ORDER BY c.ordinal_position
        ) AS columns
    FROM information_schema.tables t
    LEFT JOIN information_schema.columns c 
        ON t.table_name = c.table_name 
        AND t.table_schema = c.table_schema
    WHERE t.table_schema = 'public'
        AND t.table_type = 'BASE TABLE'
    GROUP BY t.table_name
),
row_counts AS (
    SELECT 'users' AS table_name, COUNT(*)::text AS row_count FROM users
    UNION ALL
    SELECT 'audio_commands', COUNT(*)::text FROM audio_commands
    UNION ALL
    SELECT 'obs_tokens', COUNT(*)::text FROM obs_tokens
    UNION ALL
    SELECT 'user_images', COUNT(*)::text FROM user_images
)
SELECT 
    ti.table_name,
    ti.column_count,
    rc.row_count,
    ti.columns
FROM table_info ti
LEFT JOIN row_counts rc ON ti.table_name = rc.table_name
ORDER BY ti.table_name;

