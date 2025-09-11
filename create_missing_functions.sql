-- Create missing log_timeline_event function
-- This function is called by the trigger but doesn't exist

-- 1. Create the log_timeline_event function
CREATE OR REPLACE FUNCTION public.log_timeline_event(
    p_ticket_id UUID,
    p_event_type VARCHAR(50),
    p_old_value TEXT DEFAULT NULL,
    p_new_value TEXT DEFAULT NULL,
    p_performed_by UUID DEFAULT NULL,
    p_performed_by_name VARCHAR(255) DEFAULT NULL,
    p_performed_by_role VARCHAR(50) DEFAULT NULL,
    p_details JSONB DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
    INSERT INTO public.ticket_history (
        ticket_id, 
        action_type, 
        old_value, 
        new_value,
        performed_by, 
        performed_by_role, 
        details
    ) VALUES (
        p_ticket_id, 
        p_event_type, 
        p_old_value, 
        p_new_value,
        COALESCE(p_performed_by_name, 'System'), 
        COALESCE(p_performed_by_role, 'system'),
        p_details
    );
END;
$$ LANGUAGE plpgsql;

-- 2. Verify the function was created
SELECT 
    proname AS function_name,
    pg_get_function_arguments(p.oid) AS arguments,
    pg_get_function_result(p.oid) AS return_type
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
AND proname = 'log_timeline_event';

-- 3. Test the function with a sample call
SELECT public.log_timeline_event(
    '00000000-0000-0000-0000-000000000000'::UUID,
    'test_event',
    'old_value',
    'new_value',
    NULL,
    'Test User',
    'test_role',
    '{"test": "data"}'::JSONB
);
