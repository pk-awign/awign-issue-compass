
-- Create ticket_history table to track all ticket changes
CREATE TABLE IF NOT EXISTS public.ticket_history (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    ticket_id UUID NOT NULL REFERENCES public.tickets(id) ON DELETE CASCADE,
    action_type VARCHAR(50) NOT NULL CHECK (action_type IN ('status_change', 'assignment', 'comment_added', 'created', 'resolved', 'approved', 'rejected')),
    old_value TEXT,
    new_value TEXT,
    performed_by VARCHAR(255) NOT NULL,
    performed_by_role VARCHAR(50) NOT NULL,
    performed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    details JSONB
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_ticket_history_ticket_id ON public.ticket_history(ticket_id);
CREATE INDEX IF NOT EXISTS idx_ticket_history_performed_at ON public.ticket_history(performed_at);

-- Enable RLS on ticket_history
ALTER TABLE public.ticket_history ENABLE ROW LEVEL SECURITY;

-- Create policy for ticket_history
CREATE POLICY "Allow all operations on ticket_history" ON public.ticket_history FOR ALL USING (true);

-- Add resolution_time and sla_breach tracking to tickets table
ALTER TABLE public.tickets 
ADD COLUMN IF NOT EXISTS resolution_time_hours INTEGER,
ADD COLUMN IF NOT EXISTS sla_target_hours INTEGER DEFAULT 24,
ADD COLUMN IF NOT EXISTS is_sla_breached BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS escalated_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS last_activity_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Create function to calculate resolution time
CREATE OR REPLACE FUNCTION public.calculate_resolution_time()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'resolved' AND OLD.status != 'resolved' THEN
        NEW.resolved_at = NOW();
        NEW.resolution_time_hours = EXTRACT(EPOCH FROM (NOW() - NEW.submitted_at)) / 3600;
        NEW.is_sla_breached = NEW.resolution_time_hours > NEW.sla_target_hours;
    END IF;
    
    NEW.last_activity_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for resolution time calculation
DROP TRIGGER IF EXISTS trigger_calculate_resolution_time ON public.tickets;
CREATE TRIGGER trigger_calculate_resolution_time
    BEFORE UPDATE ON public.tickets
    FOR EACH ROW
    EXECUTE FUNCTION public.calculate_resolution_time();

-- Create function to log ticket history
CREATE OR REPLACE FUNCTION public.log_ticket_history()
RETURNS TRIGGER AS $$
BEGIN
    -- Log status changes
    IF TG_OP = 'UPDATE' AND OLD.status != NEW.status THEN
        INSERT INTO public.ticket_history (
            ticket_id, action_type, old_value, new_value, 
            performed_by, performed_by_role, details
        ) VALUES (
            NEW.id, 'status_change', OLD.status, NEW.status,
            COALESCE(NEW.assigned_resolver, 'System'), 'resolver',
            jsonb_build_object('resolution_notes', NEW.resolution_notes)
        );
    END IF;
    
    -- Log assignment changes
    IF TG_OP = 'UPDATE' AND COALESCE(OLD.assigned_resolver, '') != COALESCE(NEW.assigned_resolver, '') THEN
        INSERT INTO public.ticket_history (
            ticket_id, action_type, old_value, new_value,
            performed_by, performed_by_role
        ) VALUES (
            NEW.id, 'assignment', OLD.assigned_resolver, NEW.assigned_resolver,
            COALESCE(NEW.assigned_approver, 'System'), 'approver'
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
    END IF;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create trigger for ticket history logging
DROP TRIGGER IF EXISTS trigger_log_ticket_history ON public.tickets;
CREATE TRIGGER trigger_log_ticket_history
    AFTER INSERT OR UPDATE ON public.tickets
    FOR EACH ROW
    EXECUTE FUNCTION public.log_ticket_history();

-- Create function to log comment history
CREATE OR REPLACE FUNCTION public.log_comment_history()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.ticket_history (
        ticket_id, action_type, new_value,
        performed_by, performed_by_role, details
    ) VALUES (
        NEW.ticket_id, 'comment_added', LEFT(NEW.content, 100),
        NEW.author, NEW.author_role,
        jsonb_build_object('is_internal', NEW.is_internal, 'comment_id', NEW.id)
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for comment history logging
DROP TRIGGER IF EXISTS trigger_log_comment_history ON public.comments;
CREATE TRIGGER trigger_log_comment_history
    AFTER INSERT ON public.comments
    FOR EACH ROW
    EXECUTE FUNCTION public.log_comment_history();
