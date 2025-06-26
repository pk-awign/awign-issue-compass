
-- First, let's safely update the roles by temporarily removing constraints, 
-- updating data, then adding new constraints

-- Remove existing role constraints temporarily
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE public.comments DROP CONSTRAINT IF EXISTS comments_author_role_check;
ALTER TABLE public.ticket_history DROP CONSTRAINT IF EXISTS ticket_history_performed_by_role_check;

-- Update existing user roles in the database
UPDATE public.users 
SET role = CASE 
    WHEN role = 'invigilator' THEN 'invigilator'  -- Keep as is
    WHEN role = 'supervisor' THEN 'resolver'      -- Change supervisor to resolver
    WHEN role = 'city_owner' THEN 'approver'      -- Change city_owner to approver
    WHEN role = 'operations_head' THEN 'super_admin' -- Change operations_head to super_admin
    WHEN role = 'public_user' THEN 'invigilator'  -- Convert public_user to invigilator
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

-- Now add the updated constraints with new role names
ALTER TABLE public.users ADD CONSTRAINT users_role_check 
CHECK (role IN ('invigilator', 'resolver', 'approver', 'super_admin'));

ALTER TABLE public.comments ADD CONSTRAINT comments_author_role_check 
CHECK (author_role IN ('invigilator', 'admin', 'resolver', 'approver', 'super_admin'));

ALTER TABLE public.ticket_history ADD CONSTRAINT ticket_history_performed_by_role_check 
CHECK (performed_by_role IN ('invigilator', 'admin', 'resolver', 'approver', 'super_admin'));
