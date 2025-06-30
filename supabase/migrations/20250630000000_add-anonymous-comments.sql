-- Add anonymous role to comments table
ALTER TABLE public.comments 
DROP CONSTRAINT IF EXISTS comments_author_role_check;

ALTER TABLE public.comments 
ADD CONSTRAINT comments_author_role_check 
CHECK (author_role IN ('invigilator', 'admin', 'resolver', 'approver', 'super_admin', 'anonymous'));

-- Add anonymous role to ticket_history table
ALTER TABLE public.ticket_history 
DROP CONSTRAINT IF EXISTS ticket_history_performed_by_role_check;

ALTER TABLE public.ticket_history 
ADD CONSTRAINT ticket_history_performed_by_role_check 
CHECK (performed_by_role IN ('invigilator', 'admin', 'resolver', 'approver', 'super_admin', 'anonymous', 'system')); 