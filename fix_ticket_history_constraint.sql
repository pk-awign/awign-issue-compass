-- Fix ticket_history check constraint issue
-- Check what action_type values are allowed

-- 1. Check the constraint on ticket_history.action_type
SELECT 
    conname AS constraint_name,
    pg_get_constraintdef(c.oid) AS constraint_definition
FROM pg_constraint c
JOIN pg_class t ON c.conrelid = t.oid
JOIN pg_namespace n ON t.relnamespace = n.oid
WHERE n.nspname = 'public'
AND t.relname = 'ticket_history'
AND c.contype = 'c';

-- 2. Check what action_type values currently exist
SELECT DISTINCT action_type 
FROM public.ticket_history 
ORDER BY action_type;

-- 3. Update the log_timeline_event function to use valid action_type values
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
    -- Map event types to valid action_type values
    DECLARE
        valid_action_type VARCHAR(50);
    BEGIN
        CASE p_event_type
            WHEN 'created' THEN valid_action_type := 'created';
            WHEN 'status_changed' THEN valid_action_type := 'status_change';
            WHEN 'assigned' THEN valid_action_type := 'assigned';
            WHEN 'comment_added' THEN valid_action_type := 'comment_added';
            WHEN 'attachment_uploaded' THEN valid_action_type := 'attachment_uploaded';
            WHEN 'reopened' THEN valid_action_type := 'reopened';
            WHEN 'escalated' THEN valid_action_type := 'escalated';
            WHEN 'sla_breached' THEN valid_action_type := 'sla_breached';
            ELSE valid_action_type := 'updated'; -- Default fallback
        END CASE;
        
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
            valid_action_type, 
            p_old_value, 
            p_new_value,
            COALESCE(p_performed_by_name, 'System'), 
            COALESCE(p_performed_by_role, 'system'),
            p_details
        );
    END;
END;
$$ LANGUAGE plpgsql;

-- 4. Test the function with a valid action_type
SELECT public.log_timeline_event(
    '00000000-0000-0000-0000-000000000000'::UUID,
    'created',
    'old_value',
    'new_value',
    NULL,
    'Test User',
    'test_role',
    '{"test": "data"}'::JSONB
);
