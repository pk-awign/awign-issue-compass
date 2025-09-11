-- FINAL FIX: Remove assigned_resolver references from ticket_timeline_trigger
-- This is the last piece needed to make ticket creation work

-- 1. Drop and recreate ticket_timeline_trigger function WITHOUT assigned_resolver references
DROP FUNCTION IF EXISTS public.ticket_timeline_trigger();

CREATE OR REPLACE FUNCTION public.ticket_timeline_trigger()
RETURNS TRIGGER AS $$
DECLARE
    v_user_name VARCHAR(255);
    v_user_role VARCHAR(50);
BEGIN
    -- Get user details if performed_by is provided
    IF NEW.status_changed_by IS NOT NULL THEN
        SELECT name, role INTO v_user_name, v_user_role
        FROM public.users
        WHERE id = NEW.status_changed_by;
    END IF;

    -- Log status changes
    IF TG_OP = 'UPDATE' AND OLD.status != NEW.status THEN
        PERFORM public.log_timeline_event(
            NEW.id, 'status_changed', OLD.status::TEXT, NEW.status::TEXT,
            NEW.status_changed_by, v_user_name, v_user_role,
            jsonb_build_object('resolution_notes', NEW.resolution_notes)
        );

        -- Handle re-open logic
        IF OLD.status = 'resolved' AND NEW.status = 'open' THEN
            NEW.reopen_count = COALESCE(OLD.reopen_count, 0) + 1;
            NEW.last_reopened_at = NOW();
            NEW.reopened_by = NEW.status_changed_by;

            PERFORM public.log_timeline_event(
                NEW.id, 'reopened', 'resolved', 'open',
                NEW.status_changed_by, v_user_name, v_user_role,
                jsonb_build_object('reopen_count', NEW.reopen_count)
            );
        END IF;
    END IF;

    -- Log ticket creation
    IF TG_OP = 'INSERT' THEN
        PERFORM public.log_timeline_event(
            NEW.id, 'created', NULL, NEW.status::TEXT,
            NEW.submitted_by_user_id, NEW.submitted_by, 'invigilator',
            jsonb_build_object('ticket_number', NEW.ticket_number, 'severity', NEW.severity)
        );
    END IF;

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- 2. Verify the function no longer has assigned_resolver references
SELECT 
    proname AS function_name,
    CASE
        WHEN pg_get_functiondef(p.oid) ILIKE '%assigned_resolver%' THEN 'STILL HAS assigned_resolver reference - NEEDS ATTENTION'
        ELSE 'NO assigned_resolver reference - FIXED!'
    END AS assigned_resolver_status
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
AND proname = 'ticket_timeline_trigger';

-- 3. Test with a REAL ticket creation (not just timeline entry)
-- This will create an actual ticket and test the complete flow
INSERT INTO public.tickets (
    ticket_number,
    centre_code,
    city,
    resource_id,
    issue_category,
    issue_description,
    issue_date,
    severity,
    status,
    is_anonymous,
    submitted_by,
    submitted_by_user_id
) VALUES (
    'TEST-' || EXTRACT(EPOCH FROM NOW())::BIGINT,
    '999',
    'Test City',
    'TEST001',
    'technical',
    'Test ticket creation after final database fix',
    CURRENT_DATE,
    'medium',
    'open',
    true,
    'Test User',
    NULL
) RETURNING id, ticket_number, status;

-- 4. Check if timeline was created for the test ticket
SELECT 
    th.action_type,
    th.performed_by,
    th.performed_by_role,
    th.details,
    th.created_at
FROM public.ticket_history th
JOIN public.tickets t ON th.ticket_id = t.id
WHERE t.ticket_number LIKE 'TEST-%'
ORDER BY th.created_at DESC
LIMIT 1;

-- 5. Clean up test ticket
DELETE FROM public.tickets 
WHERE ticket_number LIKE 'TEST-%';

DELETE FROM public.ticket_history 
WHERE ticket_id IN (
    SELECT id FROM public.tickets WHERE ticket_number LIKE 'TEST-%'
);

-- 6. Final verification - check that NO functions have assigned_resolver references
SELECT 
    proname AS function_name,
    CASE
        WHEN pg_get_functiondef(p.oid) ILIKE '%assigned_resolver%' THEN 'STILL HAS assigned_resolver reference'
        ELSE 'NO assigned_resolver reference - CLEAN!'
    END AS assigned_resolver_status
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
AND (pg_get_functiondef(p.oid) ILIKE '%assigned_resolver%')
ORDER BY proname;

-- 7. Success message
SELECT 'FINAL FIX COMPLETE - TICKET CREATION SHOULD NOW WORK!' AS status;
