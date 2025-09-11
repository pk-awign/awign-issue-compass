-- Fix ALL functions that reference assigned_resolver
-- This addresses both ticket_timeline_trigger and log_ticket_history

-- 1. Fix the trigger function (re-run in case it wasn't properly updated)
DROP TRIGGER IF EXISTS ticket_timeline_trigger ON public.tickets;
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
        -- Log to ticket_history (existing)
        INSERT INTO public.ticket_history (
            ticket_id, action_type, old_value, new_value, 
            performed_by, performed_by_role, details
        ) VALUES (
            NEW.id, 'status_change', OLD.status, NEW.status,
            COALESCE(v_user_name, 'System'), COALESCE(v_user_role, 'system'),
            jsonb_build_object('resolution_notes', NEW.resolution_notes)
        );
        
        -- Log to timeline (new)
        PERFORM public.log_timeline_event(
            NEW.id, 'status_changed', OLD.status, NEW.status,
            NEW.status_changed_by, v_user_name, v_user_role,
            jsonb_build_object('resolution_notes', NEW.resolution_notes)
        );
        
        -- Handle re-open logic
        IF OLD.status = 'resolved' AND NEW.status = 'open' THEN
            NEW.reopen_count = COALESCE(OLD.reopen_count, 0) + 1;
            NEW.last_reopened_at = NOW();
            NEW.reopened_by = NEW.status_changed_by;
            
            -- Log re-open event
            PERFORM public.log_timeline_event(
                NEW.id, 'reopened', 'resolved', 'open',
                NEW.status_changed_by, v_user_name, v_user_role,
                jsonb_build_object('reopen_count', NEW.reopen_count)
            );
        END IF;
    END IF;
    
    -- NOTE: Assignment changes are now handled by the ticket_assignees table triggers
    -- No need to log assignment changes here since we removed assigned_resolver column
    
    -- Log ticket creation
    IF TG_OP = 'INSERT' THEN
        INSERT INTO public.ticket_history (
            ticket_id, action_type, new_value,
            performed_by, performed_by_role, details
        ) VALUES (
            NEW.id, 'created', NEW.status,
            COALESCE(NEW.submitted_by, 'Anonymous'), 'invigilator',
            jsonb_build_object('ticket_number', NEW.ticket_number, 'severity', NEW.severity)
        );
        
        PERFORM public.log_timeline_event(
            NEW.id, 'created', NULL, NEW.status,
            NEW.submitted_by_user_id, NEW.submitted_by, 'invigilator',
            jsonb_build_object('ticket_number', NEW.ticket_number, 'severity', NEW.severity)
        );
    END IF;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Recreate the trigger
CREATE TRIGGER ticket_timeline_trigger
    BEFORE INSERT OR UPDATE ON public.tickets
    FOR EACH ROW
    EXECUTE FUNCTION public.ticket_timeline_trigger();

-- 2. Fix the log_ticket_history function
-- First, let's see what this function looks like
SELECT pg_get_functiondef(p.oid) as function_definition
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE p.proname = 'log_ticket_history' AND n.nspname = 'public';

-- Drop the trigger first, then the function
DROP TRIGGER IF EXISTS trigger_log_ticket_history ON public.tickets;
DROP FUNCTION IF EXISTS public.log_ticket_history();

CREATE OR REPLACE FUNCTION public.log_ticket_history(
    p_ticket_id UUID,
    p_action_type VARCHAR(50),
    p_old_value TEXT DEFAULT NULL,
    p_new_value TEXT DEFAULT NULL,
    p_performed_by VARCHAR(255) DEFAULT NULL,
    p_performed_by_role VARCHAR(50) DEFAULT NULL,
    p_details JSONB DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
    -- Log to ticket_history table
    INSERT INTO public.ticket_history (
        ticket_id,
        action_type,
        old_value,
        new_value,
        performed_by,
        performed_by_role,
        details,
        performed_at
    ) VALUES (
        p_ticket_id,
        p_action_type,
        p_old_value,
        p_new_value,
        p_performed_by,
        p_performed_by_role,
        p_details,
        NOW()
    );
    
    -- Log to timeline table
    PERFORM public.log_timeline_event(
        p_ticket_id,
        p_action_type,
        p_old_value,
        p_new_value,
        NULL, -- performed_by_user_id (we don't have it in this function)
        p_performed_by,
        p_performed_by_role,
        p_details
    );
END;
$$ LANGUAGE plpgsql;

-- 3. Fix the view (re-run in case it wasn't properly updated)
DROP VIEW IF EXISTS public.ticket_details_view;

CREATE VIEW public.ticket_details_view AS
SELECT 
    t.id,
    t.ticket_number,
    t.centre_code,
    t.city,
    t.resource_id,
    t.awign_app_ticket_id,
    t.issue_category,
    t.issue_description,
    t.issue_date,
    t.severity,
    t.status,
    t.is_anonymous,
    t.submitted_by,
    t.submitted_by_user_id,
    t.submitted_at,
    t.resolution_notes,
    t.resolved_at,
    t.reopen_count,
    t.last_reopened_at,
    t.reopened_by,
    t.status_changed_at,
    t.status_changed_by,
    t.user_dependency_started_at,
    t.created_at,
    t.updated_at,
    -- Get resolver information from ticket_assignees table
    (SELECT ta.user_id 
     FROM public.ticket_assignees ta 
     WHERE ta.ticket_id = t.id 
     AND ta.role = 'resolver' 
     LIMIT 1) as assigned_resolver,
    -- Get approver information from ticket_assignees table  
    (SELECT ta.user_id 
     FROM public.ticket_assignees ta 
     WHERE ta.ticket_id = t.id 
     AND ta.role = 'approver' 
     LIMIT 1) as assigned_approver,
    -- Get ticket admin information from ticket_assignees table
    (SELECT ta.user_id 
     FROM public.ticket_assignees ta 
     WHERE ta.ticket_id = t.id 
     AND ta.role = 'ticket_admin' 
     LIMIT 1) as assigned_ticket_admin,
    -- Get resolver name
    u1.name as assigned_resolver_name,
    u1.role as assigned_resolver_role,
    -- Get approver name
    u2.name as assigned_approver_name,
    u2.role as assigned_approver_role,
    -- Get ticket admin name
    u3.name as assigned_ticket_admin_name,
    u3.role as assigned_ticket_admin_role
FROM public.tickets t
LEFT JOIN public.ticket_assignees ta1 ON t.id = ta1.ticket_id AND ta1.role = 'resolver'
LEFT JOIN public.users u1 ON ta1.user_id = u1.id
LEFT JOIN public.ticket_assignees ta2 ON t.id = ta2.ticket_id AND ta2.role = 'approver'
LEFT JOIN public.users u2 ON ta2.user_id = u2.id
LEFT JOIN public.ticket_assignees ta3 ON t.id = ta3.ticket_id AND ta3.role = 'ticket_admin'
LEFT JOIN public.users u3 ON ta3.user_id = u3.id;

-- 4. Verify all fixes
-- Check that no functions still reference assigned_resolver
SELECT 
    p.proname as function_name,
    CASE 
        WHEN pg_get_functiondef(p.oid) ILIKE '%assigned_resolver%' THEN 'STILL HAS assigned_resolver reference'
        ELSE 'No assigned_resolver reference - FIXED'
    END as status
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
AND p.proname ILIKE '%ticket%'
ORDER BY p.proname;

-- Check that the view was recreated without assigned_resolver references
SELECT 
    schemaname,
    viewname,
    CASE 
        WHEN definition ILIKE '%assigned_resolver%' THEN 'STILL HAS assigned_resolver reference - NEEDS MANUAL FIX'
        ELSE 'No assigned_resolver reference - FIXED'
    END as status
FROM pg_views 
WHERE viewname = 'ticket_details_view' 
AND schemaname = 'public';

-- Check that triggers were recreated successfully
SELECT 
    trigger_name,
    event_manipulation,
    action_statement
FROM information_schema.triggers 
WHERE event_object_table = 'tickets' 
AND trigger_name = 'ticket_timeline_trigger';
