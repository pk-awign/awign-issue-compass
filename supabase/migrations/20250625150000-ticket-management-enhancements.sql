-- Enhanced Ticket Management System Migration
-- This migration adds comprehensive ticket management features

-- 1. Update tickets table with new fields
ALTER TABLE public.tickets 
ADD COLUMN IF NOT EXISTS reopen_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_reopened_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS reopened_by UUID REFERENCES public.users(id),
ADD COLUMN IF NOT EXISTS status_changed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS status_changed_by UUID REFERENCES public.users(id);

-- 2. Update status enum to include new statuses
-- First, create a new type with all statuses
CREATE TYPE ticket_status_new AS ENUM (
    'open', 
    'in_progress', 
    'send_for_approval', 
    'approved', 
    'resolved'
);

-- 3. Create a temporary column with new type
ALTER TABLE public.tickets 
ADD COLUMN status_new ticket_status_new;

-- 4. Update existing data to map to new statuses
UPDATE public.tickets 
SET status_new = CASE 
    WHEN status = 'open' THEN 'open'::ticket_status_new
    WHEN status = 'in_progress' THEN 'in_progress'::ticket_status_new
    WHEN status = 'resolved' THEN 'resolved'::ticket_status_new
    WHEN status = 'closed' THEN 'resolved'::ticket_status_new
    ELSE 'open'::ticket_status_new
END;

-- 5. Drop old status column and rename new one
ALTER TABLE public.tickets DROP COLUMN status;
ALTER TABLE public.tickets RENAME COLUMN status_new TO status;
ALTER TABLE public.tickets ALTER COLUMN status SET NOT NULL;

-- 6. Drop old enum type
DROP TYPE IF EXISTS ticket_status_old;

-- 7. Create status transition rules table
CREATE TABLE IF NOT EXISTS public.status_transitions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    from_status ticket_status_new NOT NULL,
    to_status ticket_status_new NOT NULL,
    allowed_roles TEXT[] NOT NULL,
    requires_comment BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(from_status, to_status)
);

-- 8. Insert status transition rules
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

-- 9. Create ticket timeline table for detailed history
CREATE TABLE IF NOT EXISTS public.ticket_timeline (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    ticket_id UUID NOT NULL REFERENCES public.tickets(id) ON DELETE CASCADE,
    event_type VARCHAR(50) NOT NULL CHECK (event_type IN (
        'created', 'status_changed', 'assigned', 'comment_added', 
        'attachment_uploaded', 'reopened', 'escalated', 'sla_breached'
    )),
    old_value TEXT,
    new_value TEXT,
    performed_by UUID REFERENCES public.users(id),
    performed_by_name VARCHAR(255),
    performed_by_role VARCHAR(50),
    details JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 10. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_tickets_status ON public.tickets(status);
CREATE INDEX IF NOT EXISTS idx_tickets_reopen_count ON public.tickets(reopen_count);
CREATE INDEX IF NOT EXISTS idx_tickets_status_changed_at ON public.tickets(status_changed_at);
CREATE INDEX IF NOT EXISTS idx_ticket_timeline_ticket_id ON public.ticket_timeline(ticket_id);
CREATE INDEX IF NOT EXISTS idx_ticket_timeline_created_at ON public.ticket_timeline(created_at);
CREATE INDEX IF NOT EXISTS idx_status_transitions_from_status ON public.status_transitions(from_status);

-- 11. Enable RLS on new tables
ALTER TABLE public.status_transitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_timeline ENABLE ROW LEVEL SECURITY;

-- 12. Create policies for new tables
CREATE POLICY "Allow all operations on status_transitions" ON public.status_transitions FOR ALL USING (true);
CREATE POLICY "Allow all operations on ticket_timeline" ON public.ticket_timeline FOR ALL USING (true);

-- 13. Create function to validate status transitions
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

-- 14. Create function to log timeline events
CREATE OR REPLACE FUNCTION public.log_timeline_event(
    p_ticket_id UUID,
    p_event_type VARCHAR(50),
    p_old_value TEXT DEFAULT NULL,
    p_new_value TEXT DEFAULT NULL,
    p_performed_by UUID DEFAULT NULL,
    p_performed_by_name VARCHAR(255) DEFAULT NULL,
    p_performed_by_role VARCHAR(50) DEFAULT NULL,
    p_details JSONB DEFAULT NULL
)
RETURNS void AS $$
BEGIN
    INSERT INTO public.ticket_timeline (
        ticket_id, event_type, old_value, new_value,
        performed_by, performed_by_name, performed_by_role, details
    ) VALUES (
        p_ticket_id, p_event_type, p_old_value, p_new_value,
        p_performed_by, p_performed_by_name, p_performed_by_role, p_details
    );
END;
$$ LANGUAGE plpgsql;

-- 15. Update the existing trigger to handle new status flow
CREATE OR REPLACE FUNCTION public.log_ticket_history()
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
    
    -- Log assignment changes
    IF TG_OP = 'UPDATE' AND COALESCE(OLD.assigned_resolver, '') != COALESCE(NEW.assigned_resolver, '') THEN
        INSERT INTO public.ticket_history (
            ticket_id, action_type, old_value, new_value,
            performed_by, performed_by_role
        ) VALUES (
            NEW.id, 'assignment', OLD.assigned_resolver, NEW.assigned_resolver,
            COALESCE(v_user_name, 'System'), COALESCE(v_user_role, 'system')
        );
        
        PERFORM public.log_timeline_event(
            NEW.id, 'assigned', OLD.assigned_resolver, NEW.assigned_resolver,
            NEW.status_changed_by, v_user_name, v_user_role
        );
    END IF;
    
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

-- 16. Create function to update status with validation
CREATE OR REPLACE FUNCTION public.update_ticket_status(
    p_ticket_id UUID,
    p_new_status ticket_status_new,
    p_user_id UUID,
    p_resolution_notes TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
    v_current_status ticket_status_new;
    v_user_role VARCHAR(50);
    v_user_name VARCHAR(255);
    v_transition_valid BOOLEAN;
BEGIN
    -- Get current ticket status
    SELECT status INTO v_current_status
    FROM public.tickets
    WHERE id = p_ticket_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Ticket not found';
    END IF;
    
    -- Get user details
    SELECT role, name INTO v_user_role, v_user_name
    FROM public.users
    WHERE id = p_user_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'User not found';
    END IF;
    
    -- Validate transition
    v_transition_valid := public.validate_status_transition(p_ticket_id, v_current_status, p_new_status, v_user_role);
    
    IF NOT v_transition_valid THEN
        RAISE EXCEPTION 'Invalid status transition from % to % for role %', v_current_status, p_new_status, v_user_role;
    END IF;
    
    -- Update ticket
    UPDATE public.tickets
    SET 
        status = p_new_status,
        status_changed_at = NOW(),
        status_changed_by = p_user_id,
        resolution_notes = COALESCE(p_resolution_notes, resolution_notes)
    WHERE id = p_ticket_id;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- 17. Set default status for new tickets
ALTER TABLE public.tickets ALTER COLUMN status SET DEFAULT 'open';

-- 18. Add constraint to ensure reopen_count is non-negative
ALTER TABLE public.tickets ADD CONSTRAINT tickets_reopen_count_check CHECK (reopen_count >= 0);

-- 19. Create view for ticket details with user information
CREATE OR REPLACE VIEW public.ticket_details_view AS
SELECT 
    t.*,
    u1.name as submitted_by_name,
    u1.role as submitted_by_role,
    u2.name as assigned_resolver_name,
    u2.role as assigned_resolver_role,
    u3.name as assigned_approver_name,
    u3.role as assigned_approver_role,
    u4.name as status_changed_by_name,
    u4.role as status_changed_by_role,
    u5.name as reopened_by_name,
    u5.role as reopened_by_role
FROM public.tickets t
LEFT JOIN public.users u1 ON t.submitted_by_user_id = u1.id
LEFT JOIN public.users u2 ON t.assigned_resolver = u2.id
LEFT JOIN public.users u3 ON t.assigned_approver = u3.id
LEFT JOIN public.users u4 ON t.status_changed_by = u4.id
LEFT JOIN public.users u5 ON t.reopened_by = u5.id;

-- 20. Grant permissions
GRANT SELECT ON public.ticket_details_view TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_ticket_status TO authenticated;
GRANT EXECUTE ON FUNCTION public.log_timeline_event TO authenticated; 