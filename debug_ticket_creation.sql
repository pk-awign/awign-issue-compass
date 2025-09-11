-- Debug ticket creation issues
-- Check what functions exist and their signatures

-- 1. Check if log_timeline_event function exists
SELECT 
    proname AS function_name,
    pg_get_function_arguments(p.oid) AS arguments,
    pg_get_function_result(p.oid) AS return_type,
    pg_get_functiondef(p.oid) AS definition
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
AND proname LIKE '%timeline%'
ORDER BY proname;

-- 2. Check if log_ticket_history function exists
SELECT 
    proname AS function_name,
    pg_get_function_arguments(p.oid) AS arguments,
    pg_get_function_result(p.oid) AS return_type
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
AND proname LIKE '%history%'
ORDER BY proname;

-- 3. Check ticket_status_new type
SELECT 
    typname,
    typtype,
    typelem
FROM pg_type 
WHERE typname LIKE '%status%'
ORDER BY typname;

-- 4. Check what triggers exist on tickets table
SELECT 
    trigger_name,
    event_manipulation,
    action_timing,
    action_statement
FROM information_schema.triggers 
WHERE event_object_table = 'tickets'
ORDER BY trigger_name;
