-- Migration 2: Add User Dependency Status Implementation
-- This migration adds all the functionality for the user_dependency status
-- Must be run AFTER the first migration (20250703000000_add_user_dependency_enum.sql)

-- Add userDependencyStartedAt column to tickets table
ALTER TABLE public.tickets ADD COLUMN IF NOT EXISTS user_dependency_started_at TIMESTAMP WITH TIME ZONE;

-- Clear existing status transitions and insert new ones with User Dependency
DELETE FROM public.status_transitions;

-- Insert updated status transition rules
INSERT INTO public.status_transitions (from_status, to_status, allowed_roles, requires_comment) VALUES
-- Resolver transitions (including User Dependency flow)
('open', 'in_progress', ARRAY['resolver', 'super_admin'], false),
('open', 'user_dependency', ARRAY['resolver', 'super_admin'], true),
('in_progress', 'send_for_approval', ARRAY['resolver', 'super_admin'], true),
('in_progress', 'ops_input_required', ARRAY['resolver', 'super_admin'], true),
('in_progress', 'user_dependency', ARRAY['resolver', 'super_admin'], true),
('ops_input_required', 'in_progress', ARRAY['resolver', 'super_admin'], true),
('ops_input_required', 'user_dependency', ARRAY['resolver', 'super_admin'], true),
('user_dependency', 'in_progress', ARRAY['resolver', 'super_admin'], true),
('user_dependency', 'send_for_approval', ARRAY['resolver', 'super_admin'], true),

-- Approver transitions (forward only)
('send_for_approval', 'approved', ARRAY['approver', 'super_admin'], false),
('approved', 'resolved', ARRAY['approver', 'super_admin'], false),

-- Super Admin can transition to any status (including backward for management)
('open', 'send_for_approval', ARRAY['super_admin'], false),
('open', 'approved', ARRAY['super_admin'], false),
('open', 'resolved', ARRAY['super_admin'], false),
('in_progress', 'open', ARRAY['super_admin'], false),
('in_progress', 'approved', ARRAY['super_admin'], false),
('in_progress', 'resolved', ARRAY['super_admin'], false),
('ops_input_required', 'open', ARRAY['super_admin'], false),
('ops_input_required', 'approved', ARRAY['super_admin'], false),
('ops_input_required', 'resolved', ARRAY['super_admin'], false),
('user_dependency', 'open', ARRAY['super_admin'], false),
('user_dependency', 'approved', ARRAY['super_admin'], false),
('user_dependency', 'resolved', ARRAY['super_admin'], false),
('send_for_approval', 'open', ARRAY['super_admin'], false),
('send_for_approval', 'resolved', ARRAY['super_admin'], false),
('send_for_approval', 'user_dependency', ARRAY['super_admin'], false),
('approved', 'open', ARRAY['super_admin'], false),
('approved', 'in_progress', ARRAY['super_admin'], false),
('approved', 'send_for_approval', ARRAY['super_admin'], false),
('approved', 'user_dependency', ARRAY['super_admin'], false),

-- Re-open transitions (only for resolved tickets, super admin only)
('resolved', 'open', ARRAY['super_admin'], true),
('resolved', 'in_progress', ARRAY['super_admin'], true),
('resolved', 'ops_input_required', ARRAY['super_admin'], true),
('resolved', 'user_dependency', ARRAY['super_admin'], true);

-- Create function to auto-resolve user dependency tickets after 7 days
CREATE OR REPLACE FUNCTION public.auto_resolve_user_dependency_tickets()
RETURNS INTEGER AS $$
DECLARE
    v_ticket_id UUID;
    v_count INTEGER := 0;
    v_auto_comment_id UUID;
BEGIN
    -- Find tickets in user_dependency status for more than 7 days
    FOR v_ticket_id IN 
        SELECT id 
        FROM public.tickets 
        WHERE status = 'user_dependency' 
        AND user_dependency_started_at < NOW() - INTERVAL '7 days'
        AND deleted = false
    LOOP
        -- Auto-resolve the ticket
        UPDATE public.tickets 
        SET 
            status = 'resolved',
            resolved_at = NOW(),
            resolution_notes = COALESCE(resolution_notes, '') || E'\n\nAuto-closed due to no response from the user',
            status_changed_at = NOW(),
            status_changed_by = NULL
        WHERE id = v_ticket_id;
        
        -- Add auto-comment
        INSERT INTO public.comments (id, ticket_id, content, author, author_role, timestamp, is_internal)
        VALUES (
            gen_random_uuid(),
            v_ticket_id,
            'Auto-closed due to no response from the user',
            'System',
            'system',
            NOW(),
            false
        );
        
        -- Add timeline event
        INSERT INTO public.ticket_timeline (id, ticket_id, event_type, old_value, new_value, performed_by, performed_by_name, performed_by_role, details, created_at)
        VALUES (
            gen_random_uuid(),
            v_ticket_id,
            'status_changed',
            'user_dependency',
            'resolved',
            NULL,
            'System',
            'system',
            '{"reason": "auto_resolved", "comment": "Auto-closed due to no response from the user"}',
            NOW()
        );
        
        v_count := v_count + 1;
    END LOOP;
    
    RETURN v_count;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to set user_dependency_started_at when status changes to user_dependency
CREATE OR REPLACE FUNCTION public.set_user_dependency_started_at()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'user_dependency' AND OLD.status != 'user_dependency' THEN
        NEW.user_dependency_started_at = NOW();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS trigger_set_user_dependency_started_at ON public.tickets;
CREATE TRIGGER trigger_set_user_dependency_started_at
    BEFORE UPDATE ON public.tickets
    FOR EACH ROW
    EXECUTE FUNCTION public.set_user_dependency_started_at();

-- Create index for performance on user dependency queries
CREATE INDEX IF NOT EXISTS idx_tickets_user_dependency_status ON public.tickets(status, user_dependency_started_at) 
WHERE status = 'user_dependency';

-- Update the validate_status_transition function to handle the new status
CREATE OR REPLACE FUNCTION public.validate_status_transition(
    p_ticket_id UUID,
    p_from_status ticket_status_new,
    p_to_status ticket_status_new,
    p_user_role VARCHAR(50)
)
RETURNS BOOLEAN AS $$
DECLARE
    v_allowed_roles TEXT[];
BEGIN
    -- Super admin can do anything
    IF p_user_role = 'super_admin' THEN
        RETURN TRUE;
    END IF;
    
    -- Get allowed roles for this transition
    SELECT allowed_roles INTO v_allowed_roles
    FROM public.status_transitions
    WHERE from_status = p_from_status AND to_status = p_to_status;
    
    -- Check if user role is allowed
    RETURN p_user_role = ANY(v_allowed_roles);
END;
$$ LANGUAGE plpgsql;
