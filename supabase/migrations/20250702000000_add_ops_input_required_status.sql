-- Add Ops Input Required Status Migration
-- This migration adds the new 'ops_input_required' status for CX-Ops team collaboration

-- 1. Update the ticket_status_new enum to include the new status
ALTER TYPE ticket_status_new ADD VALUE 'ops_input_required';

-- Commit the enum change first
COMMIT;

-- 2. Clear existing status transitions and insert new ones with Ops Input Required
DELETE FROM public.status_transitions;

-- Insert updated status transition rules
INSERT INTO public.status_transitions (from_status, to_status, allowed_roles, requires_comment) VALUES
-- Resolver transitions (including Ops Input Required flow)
('open', 'in_progress', ARRAY['resolver', 'super_admin'], false),
('in_progress', 'send_for_approval', ARRAY['resolver', 'super_admin'], true),
('in_progress', 'ops_input_required', ARRAY['resolver', 'super_admin'], true),
('ops_input_required', 'in_progress', ARRAY['resolver', 'super_admin'], true),

-- Approver transitions (forward only)
('send_for_approval', 'approved', ARRAY['approver', 'super_admin'], false),
('approved', 'resolved', ARRAY['approver', 'super_admin'], false),

-- Super Admin can transition to any status (including backward for management)
('open', 'send_for_approval', ARRAY['super_admin'], false),
('open', 'approved', ARRAY['super_admin'], false),
('open', 'resolved', ARRAY['super_admin'], false),
('open', 'ops_input_required', ARRAY['super_admin'], false),
('in_progress', 'open', ARRAY['super_admin'], false),
('in_progress', 'approved', ARRAY['super_admin'], false),
('in_progress', 'resolved', ARRAY['super_admin'], false),
('send_for_approval', 'open', ARRAY['super_admin'], false),
('send_for_approval', 'resolved', ARRAY['super_admin'], false),
('send_for_approval', 'ops_input_required', ARRAY['super_admin'], false),
('approved', 'open', ARRAY['super_admin'], false),
('approved', 'in_progress', ARRAY['super_admin'], false),
('approved', 'send_for_approval', ARRAY['super_admin'], false),
('approved', 'ops_input_required', ARRAY['super_admin'], false),
('ops_input_required', 'open', ARRAY['super_admin'], false),
('ops_input_required', 'send_for_approval', ARRAY['super_admin'], false),
('ops_input_required', 'approved', ARRAY['super_admin'], false),
('ops_input_required', 'resolved', ARRAY['super_admin'], false),

-- Re-open transitions (only for resolved tickets, super admin only)
('resolved', 'open', ARRAY['super_admin'], true),
('resolved', 'in_progress', ARRAY['super_admin'], true),
('resolved', 'ops_input_required', ARRAY['super_admin'], true);

-- 3. Update the validate_status_transition function to handle the new status
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
