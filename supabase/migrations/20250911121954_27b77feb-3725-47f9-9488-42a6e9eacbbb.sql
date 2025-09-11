-- Fix the database trigger functions to properly cast enum types to text
-- This fixes the "function does not exist" error when creating tickets

-- Update the ticket_timeline_trigger function to cast status enum to text
CREATE OR REPLACE FUNCTION public.ticket_timeline_trigger()
RETURNS trigger AS $$
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
            NEW.id, 'status_change', OLD.status::text, NEW.status::text,
            COALESCE(v_user_name, 'System'), COALESCE(v_user_role, 'system'),
            jsonb_build_object('resolution_notes', NEW.resolution_notes)
        );
        
        -- Log to timeline (new) - cast enum to text
        PERFORM public.log_timeline_event(
            NEW.id, 'status_changed', OLD.status::text, NEW.status::text,
            NEW.status_changed_by, v_user_name, v_user_role,
            jsonb_build_object('resolution_notes', NEW.resolution_notes)
        );
        
        -- Handle re-open logic
        IF OLD.status = 'resolved' AND NEW.status = 'open' THEN
            NEW.reopen_count = COALESCE(OLD.reopen_count, 0) + 1;
            NEW.last_reopened_at = NOW();
            NEW.reopened_by = NEW.status_changed_by;
            
            -- Log re-open event - cast enum to text
            PERFORM public.log_timeline_event(
                NEW.id, 'reopened', 'resolved'::text, 'open'::text,
                NEW.status_changed_by, v_user_name, v_user_role,
                jsonb_build_object('reopen_count', NEW.reopen_count)
            );
        END IF;
    END IF;
    
    -- Log ticket creation
    IF TG_OP = 'INSERT' THEN
        INSERT INTO public.ticket_history (
            ticket_id, action_type, new_value,
            performed_by, performed_by_role, details
        ) VALUES (
            NEW.id, 'created', NEW.status::text,
            COALESCE(NEW.submitted_by, 'Anonymous'), 'invigilator',
            jsonb_build_object('ticket_number', NEW.ticket_number, 'severity', NEW.severity)
        );
        
        -- Cast enum to text for timeline event
        PERFORM public.log_timeline_event(
            NEW.id, 'created', NULL, NEW.status::text,
            NEW.submitted_by_user_id, NEW.submitted_by, 'invigilator',
            jsonb_build_object('ticket_number', NEW.ticket_number, 'severity', NEW.severity)
        );
    END IF;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;