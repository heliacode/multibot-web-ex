-- ============================================
-- MultiBot Database Overview
-- Run this in psql or your PostgreSQL client
-- ============================================

-- 1. List all tables
SELECT 
    table_name,
    table_type
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;

-- 2. Get detailed table information with row counts
SELECT 
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size,
    (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = tablename) AS column_count
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;

-- 3. Get all columns for all tables with details
SELECT 
    t.table_name,
    c.column_name,
    c.data_type,
    c.character_maximum_length,
    c.is_nullable,
    c.column_default,
    c.ordinal_position
FROM information_schema.tables t
JOIN information_schema.columns c ON t.table_name = c.table_name
WHERE t.table_schema = 'public'
    AND t.table_type = 'BASE TABLE'
ORDER BY t.table_name, c.ordinal_position;

-- 4. Get all primary keys
SELECT
    tc.table_name,
    kcu.column_name,
    tc.constraint_name
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu
    ON tc.constraint_name = kcu.constraint_name
WHERE tc.constraint_type = 'PRIMARY KEY'
    AND tc.table_schema = 'public'
ORDER BY tc.table_name, kcu.ordinal_position;

-- 5. Get all foreign keys with relationships
SELECT
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name,
    tc.constraint_name,
    rc.delete_rule,
    rc.update_rule
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu
    ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage ccu
    ON ccu.constraint_name = tc.constraint_name
JOIN information_schema.referential_constraints rc
    ON tc.constraint_name = rc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_schema = 'public'
ORDER BY tc.table_name, kcu.column_name;

-- 6. Get all indexes
SELECT
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY tablename, indexname;

-- 7. Get all triggers
SELECT
    trigger_name,
    event_object_table,
    event_manipulation,
    action_statement,
    action_timing
FROM information_schema.triggers
WHERE event_object_schema = 'public'
ORDER BY event_object_table, trigger_name;

-- 8. Get row counts for all tables
SELECT 
    'users' AS table_name,
    COUNT(*) AS row_count
FROM users
UNION ALL
SELECT 
    'audio_commands' AS table_name,
    COUNT(*) AS row_count
FROM audio_commands
UNION ALL
SELECT 
    'obs_tokens' AS table_name,
    COUNT(*) AS row_count
FROM obs_tokens
UNION ALL
SELECT 
    'user_images' AS table_name,
    COUNT(*) AS row_count
FROM user_images
ORDER BY table_name;

-- 9. Get table sizes and statistics
SELECT
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS total_size,
    pg_size_pretty(pg_relation_size(schemaname||'.'||tablename)) AS table_size,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename) - pg_relation_size(schemaname||'.'||tablename)) AS indexes_size,
    (SELECT n_live_tup FROM pg_stat_user_tables WHERE relname = tablename) AS estimated_rows
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- 10. Get all sequences (for auto-increment columns)
SELECT
    sequence_schema,
    sequence_name,
    data_type,
    numeric_precision,
    numeric_scale,
    start_value,
    minimum_value,
    maximum_value,
    increment
FROM information_schema.sequences
WHERE sequence_schema = 'public'
ORDER BY sequence_name;

-- 11. Get all functions (including triggers)
SELECT
    routine_schema,
    routine_name,
    routine_type,
    data_type AS return_type
FROM information_schema.routines
WHERE routine_schema = 'public'
ORDER BY routine_name;

-- 12. Sample data from each table (first 5 rows)
-- Users
SELECT '=== USERS TABLE (Sample) ===' AS info;
SELECT * FROM users LIMIT 5;

SELECT '=== AUDIO_COMMANDS TABLE (Sample) ===' AS info;
SELECT * FROM audio_commands LIMIT 5;

SELECT '=== OBS_TOKENS TABLE (Sample) ===' AS info;
SELECT id, user_id, twitch_user_id, 
       LEFT(token, 10) || '...' AS token_preview,
       created_at, last_used_at
FROM obs_tokens LIMIT 5;

SELECT '=== USER_IMAGES TABLE (Sample) ===' AS info;
SELECT * FROM user_images LIMIT 5;

