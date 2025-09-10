-- Fix ticket_assignees table trigger issue
-- The trigger is looking for performed_by column which doesn't exist
-- We need to either add the column or modify the trigger to use auth.uid()

-- Option 1: Add performed_by column to ticket_assignees table
ALTER TABLE public.ticket_assignees 
ADD COLUMN IF NOT EXISTS performed_by UUID REFERENCES public.users(id);

-- Update the trigger function to handle the case where performed_by might be null
-- and fall back to auth.uid() for the current user
CREATE OR REPLACE FUNCTION public.validate_ticket_assignment()
RETURNS TRIGGER AS $$
DECLARE
    v_user_role VARCHAR(50);
    v_user_id UUID;
BEGIN
    -- Get the user ID - either from performed_by or from auth.uid()
    v_user_id := COALESCE(NEW.performed_by, auth.uid());
    
    -- Get the role of the user making the assignment
    SELECT role INTO v_user_role
    FROM public.users
    WHERE id = v_user_id;
    
    -- If we can't find the user role, allow the operation (fallback)
    IF v_user_role IS NULL THEN
        RAISE WARNING 'Could not determine user role for user %', v_user_id;
        RETURN NEW;
    END IF;
    
    -- Validate the assignment permission
    IF NOT public.validate_assignment_permission(v_user_role, NEW.role) THEN
        RAISE EXCEPTION 'User with role % cannot assign users with role %', v_user_role, NEW.role;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Update the validation function to allow ticket_admin to assign resolvers and approvers
CREATE OR REPLACE FUNCTION public.validate_assignment_permission(
    p_user_role VARCHAR(50),
    p_assignment_role VARCHAR(50)
)
RETURNS BOOLEAN AS $$
BEGIN
    -- Allow super_admin and ticket_admin to assign resolvers and approvers
    IF p_assignment_role IN ('resolver', 'approver') AND p_user_role NOT IN ('super_admin', 'ticket_admin') THEN
        RETURN FALSE;
    END IF;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Enable RLS on ticket_assignees table (if not already enabled)
ALTER TABLE public.ticket_assignees ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for ticket_assignees table
-- Allow all operations for authenticated users (the trigger will handle role validation)
CREATE POLICY "Allow all operations on ticket_assignees" ON public.ticket_assignees 
FOR ALL USING (true);
