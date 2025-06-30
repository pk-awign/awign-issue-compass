-- Fix status transitions and role restrictions
-- Clear existing status transitions
DELETE FROM public.status_transitions;

-- Insert correct status transition rules
INSERT INTO public.status_transitions (from_status, to_status, allowed_roles, requires_comment) VALUES
-- Resolver transitions (forward only)
('open', 'in_progress', ARRAY['resolver', 'super_admin'], false),
('in_progress', 'send_for_approval', ARRAY['resolver', 'super_admin'], true),

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
('send_for_approval', 'open', ARRAY['super_admin'], false),
('send_for_approval', 'resolved', ARRAY['super_admin'], false),
('approved', 'open', ARRAY['super_admin'], false),
('approved', 'in_progress', ARRAY['super_admin'], false),
('approved', 'send_for_approval', ARRAY['super_admin'], false),

-- Re-open transitions (only for resolved tickets, super admin only)
('resolved', 'open', ARRAY['super_admin'], true);

-- Create function to validate assignment permissions
CREATE OR REPLACE FUNCTION public.validate_assignment_permission(
    p_user_role VARCHAR(50),
    p_assignment_role VARCHAR(50)
)
RETURNS BOOLEAN AS $$
BEGIN
    -- Only super_admin can assign resolvers
    IF p_assignment_role = 'resolver' AND p_user_role != 'super_admin' THEN
        RETURN FALSE;
    END IF;
    
    -- Only super_admin can assign approvers
    IF p_assignment_role = 'approver' AND p_user_role != 'super_admin' THEN
        RETURN FALSE;
    END IF;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to validate assignments
CREATE OR REPLACE FUNCTION public.validate_ticket_assignment()
RETURNS TRIGGER AS $$
DECLARE
    v_user_role VARCHAR(50);
BEGIN
    -- Get the role of the user making the assignment
    SELECT role INTO v_user_role
    FROM public.users
    WHERE id = NEW.performed_by;
    
    -- Validate the assignment permission
    IF NOT public.validate_assignment_permission(v_user_role, NEW.role) THEN
        RAISE EXCEPTION 'User with role % cannot assign users with role %', v_user_role, NEW.role;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add trigger to ticket_assignees table
DROP TRIGGER IF EXISTS validate_assignment_trigger ON public.ticket_assignees;
CREATE TRIGGER validate_assignment_trigger
    BEFORE INSERT OR UPDATE ON public.ticket_assignees
    FOR EACH ROW
    EXECUTE FUNCTION public.validate_ticket_assignment();

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.validate_assignment_permission TO authenticated;
GRANT EXECUTE ON FUNCTION public.validate_ticket_assignment TO authenticated;
