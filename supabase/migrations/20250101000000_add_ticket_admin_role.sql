-- Add ticket_admin role to the system
-- This migration adds the ticket_admin role and updates all relevant constraints

-- First, let's safely update the roles by temporarily removing constraints, 
-- updating data, then adding new constraints

-- Remove existing role constraints temporarily
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE public.comments DROP CONSTRAINT IF EXISTS comments_author_role_check;
ALTER TABLE public.ticket_history DROP CONSTRAINT IF EXISTS ticket_history_performed_by_role_check;

-- Update existing user roles in the database (keep existing mappings)
UPDATE public.users 
SET role = CASE 
    WHEN role = 'invigilator' THEN 'invigilator'  -- Keep as is
    WHEN role = 'resolver' THEN 'resolver'        -- Keep existing resolver as is
    WHEN role = 'approver' THEN 'approver'        -- Keep existing approver as is
    WHEN role = 'super_admin' THEN 'super_admin'  -- Keep existing super_admin as is
    ELSE role
END;

-- Update tickets table role references in comments/history
UPDATE public.comments 
SET author_role = CASE 
    WHEN author_role = 'supervisor' THEN 'resolver'
    WHEN author_role = 'city_owner' THEN 'approver'
    WHEN author_role = 'operations_head' THEN 'super_admin'
    ELSE author_role
END;

UPDATE public.ticket_history 
SET performed_by_role = CASE 
    WHEN performed_by_role = 'supervisor' THEN 'resolver'
    WHEN performed_by_role = 'city_owner' THEN 'approver'
    WHEN performed_by_role = 'operations_head' THEN 'super_admin'
    ELSE performed_by_role
END;

-- Now add the updated constraints with new role names including ticket_admin
ALTER TABLE public.users ADD CONSTRAINT users_role_check 
CHECK (role IN ('invigilator', 'resolver', 'approver', 'super_admin', 'ticket_admin'));

ALTER TABLE public.comments ADD CONSTRAINT comments_author_role_check 
CHECK (author_role IN ('invigilator', 'admin', 'resolver', 'approver', 'super_admin', 'ticket_admin', 'anonymous'));

ALTER TABLE public.ticket_history ADD CONSTRAINT ticket_history_performed_by_role_check 
CHECK (performed_by_role IN ('invigilator', 'admin', 'resolver', 'approver', 'super_admin', 'ticket_admin', 'anonymous', 'system'));

-- Create ticket_admin_assignments table
CREATE TABLE IF NOT EXISTS public.ticket_admin_assignments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    ticket_id UUID NOT NULL REFERENCES public.tickets(id) ON DELETE CASCADE,
    ticket_admin_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    assigned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    assigned_by UUID REFERENCES public.users(id),
    UNIQUE(ticket_id, ticket_admin_id)
);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_ticket_admin_assignments_ticket_id ON public.ticket_admin_assignments(ticket_id);
CREATE INDEX IF NOT EXISTS idx_ticket_admin_assignments_admin_id ON public.ticket_admin_assignments(ticket_admin_id);

-- Update status transitions to include ticket_admin permissions
-- Ticket admins should have similar permissions to super_admin but only for their assigned tickets
INSERT INTO public.status_transitions (from_status, to_status, allowed_roles, requires_comment) VALUES
-- Ticket Admin transitions (similar to super_admin but will be filtered by assignment)
('open', 'in_progress', ARRAY['ticket_admin'], false),
('in_progress', 'send_for_approval', ARRAY['ticket_admin'], true),
('send_for_approval', 'approved', ARRAY['ticket_admin'], false),
('approved', 'resolved', ARRAY['ticket_admin'], false),
('resolved', 'open', ARRAY['ticket_admin'], true);

-- Create function to validate ticket admin assignment permissions
CREATE OR REPLACE FUNCTION public.validate_ticket_admin_assignment_permission(
    p_user_role VARCHAR(50),
    p_assignment_role VARCHAR(50)
)
RETURNS BOOLEAN AS $$
BEGIN
    -- Only super_admin can assign ticket admins
    IF p_assignment_role = 'ticket_admin' AND p_user_role != 'super_admin' THEN
        RETURN FALSE;
    END IF;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to validate ticket admin assignments
CREATE OR REPLACE FUNCTION public.validate_ticket_admin_assignment()
RETURNS TRIGGER AS $$
DECLARE
    v_user_role VARCHAR(50);
BEGIN
    -- Get the role of the user making the assignment
    SELECT role INTO v_user_role
    FROM public.users
    WHERE id = NEW.assigned_by;
    
    -- Validate the assignment permission
    IF NOT public.validate_ticket_admin_assignment_permission(v_user_role, 'ticket_admin') THEN
        RAISE EXCEPTION 'User with role % cannot assign ticket admins', v_user_role;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add trigger to ticket_admin_assignments table
DROP TRIGGER IF EXISTS validate_ticket_admin_assignment_trigger ON public.ticket_admin_assignments;
CREATE TRIGGER validate_ticket_admin_assignment_trigger
    BEFORE INSERT OR UPDATE ON public.ticket_admin_assignments
    FOR EACH ROW
    EXECUTE FUNCTION public.validate_ticket_admin_assignment();

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.validate_ticket_admin_assignment_permission TO authenticated;
GRANT EXECUTE ON FUNCTION public.validate_ticket_admin_assignment TO authenticated;

-- Insert sample ticket admin users
INSERT INTO public.users (name, role, city, centre_code, mobile_number, is_active, pin_hash, pin) VALUES
('Mumbai Ticket Admin', 'ticket_admin', 'Mumbai', 'MUM001', '9876543220', true, 'default_pin_hash', '5678'),
('Delhi Ticket Admin', 'ticket_admin', 'Delhi', 'DEL001', '9876543221', true, 'default_pin_hash', '6789'),
('Kolkata Ticket Admin', 'ticket_admin', 'Kolkata', 'KOL001', '9876543222', true, 'default_pin_hash', '7890')
ON CONFLICT (mobile_number) DO NOTHING; 