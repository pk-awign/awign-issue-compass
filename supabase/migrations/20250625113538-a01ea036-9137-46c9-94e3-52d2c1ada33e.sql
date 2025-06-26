-- Add additional columns to users table for activity tracking
ALTER TABLE public.users 
ADD COLUMN last_login_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN last_activity_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Create user_permissions table for granular permission management
CREATE TABLE IF NOT EXISTS public.user_permissions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    permission VARCHAR(50) NOT NULL,
    granted_by UUID REFERENCES public.users(id),
    granted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, permission)
);

-- Create escalation_log table to track escalations
CREATE TABLE IF NOT EXISTS public.escalation_log (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    ticket_id UUID NOT NULL REFERENCES public.tickets(id) ON DELETE CASCADE,
    escalated_by UUID REFERENCES public.users(id),
    escalation_type VARCHAR(20) NOT NULL CHECK (escalation_type IN ('email', 'whatsapp', 'internal')),
    escalation_details JSONB,
    escalated_to VARCHAR(255),
    escalated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    response_received_at TIMESTAMP WITH TIME ZONE,
    response_details JSONB
);

-- Create assignment_log table for tracking ticket assignments
CREATE TABLE IF NOT EXISTS public.assignment_log (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    ticket_id UUID NOT NULL REFERENCES public.tickets(id) ON DELETE CASCADE,
    assigned_from VARCHAR(100),
    assigned_to VARCHAR(100) NOT NULL,
    assigned_by UUID REFERENCES public.users(id),
    assignment_type VARCHAR(20) NOT NULL DEFAULT 'manual' CHECK (assignment_type IN ('manual', 'auto', 'escalation')),
    assigned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    workload_at_assignment INTEGER DEFAULT 0
);

-- Create performance_metrics table for tracking resolver/approver performance
CREATE TABLE IF NOT EXISTS public.performance_metrics (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    metric_type VARCHAR(50) NOT NULL,
    metric_value DECIMAL(10,2) NOT NULL,
    period_start TIMESTAMP WITH TIME ZONE NOT NULL,
    period_end TIMESTAMP WITH TIME ZONE NOT NULL,
    calculated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, metric_type, period_start, period_end)
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_last_activity ON public.users(last_activity_at);
CREATE INDEX IF NOT EXISTS idx_users_role_active ON public.users(role, is_active);
CREATE INDEX IF NOT EXISTS idx_escalation_log_ticket_id ON public.escalation_log(ticket_id);
CREATE INDEX IF NOT EXISTS idx_escalation_log_escalated_at ON public.escalation_log(escalated_at);
CREATE INDEX IF NOT EXISTS idx_assignment_log_ticket_id ON public.assignment_log(ticket_id);
CREATE INDEX IF NOT EXISTS idx_assignment_log_assigned_to ON public.assignment_log(assigned_to);
CREATE INDEX IF NOT EXISTS idx_performance_metrics_user_id ON public.performance_metrics(user_id);

-- Enable RLS for new tables
ALTER TABLE public.user_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.escalation_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assignment_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.performance_metrics ENABLE ROW LEVEL SECURITY;

-- Create policies for the new tables (allowing all operations for now, can be refined later)
CREATE POLICY "Allow all operations on user_permissions" ON public.user_permissions FOR ALL USING (true);
CREATE POLICY "Allow all operations on escalation_log" ON public.escalation_log FOR ALL USING (true);
CREATE POLICY "Allow all operations on assignment_log" ON public.assignment_log FOR ALL USING (true);
CREATE POLICY "Allow all operations on performance_metrics" ON public.performance_metrics FOR ALL USING (true);

-- Create materialized view for dashboard analytics
CREATE MATERIALIZED VIEW IF NOT EXISTS public.ticket_analytics AS
SELECT 
    COUNT(*) as total_tickets,
    COUNT(*) FILTER (WHERE status = 'open') as open_tickets,
    COUNT(*) FILTER (WHERE status = 'in_progress') as in_progress_tickets,
    COUNT(*) FILTER (WHERE status = 'resolved') as resolved_tickets,
    COUNT(*) FILTER (WHERE status = 'closed') as closed_tickets,
    COUNT(*) FILTER (WHERE severity = 'sev1') as sev1_tickets,
    COUNT(*) FILTER (WHERE severity = 'sev2') as sev2_tickets,
    COUNT(*) FILTER (WHERE severity = 'sev3') as sev3_tickets,
    COUNT(*) FILTER (WHERE assigned_resolver IS NOT NULL) as assigned_tickets,
    COUNT(*) FILTER (WHERE assigned_resolver IS NULL) as unassigned_tickets,
    AVG(resolution_time_hours) FILTER (WHERE resolution_time_hours IS NOT NULL) as avg_resolution_hours,
    COUNT(*) FILTER (WHERE is_sla_breached = true) as sla_breached_tickets,
    city,
    centre_code,
    assigned_resolver,
    assigned_approver,
    DATE(created_at) as date_created
FROM public.tickets
GROUP BY city, centre_code, assigned_resolver, assigned_approver, DATE(created_at);

-- Create index on materialized view
CREATE INDEX IF NOT EXISTS idx_ticket_analytics_city ON public.ticket_analytics(city);
CREATE INDEX IF NOT EXISTS idx_ticket_analytics_date ON public.ticket_analytics(date_created);

-- Add triggers to update last_activity_at when users perform actions
CREATE OR REPLACE FUNCTION public.update_user_activity()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    UPDATE public.users 
    SET last_activity_at = NOW()
    WHERE id = NEW.performed_by::uuid;
    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        -- Ignore errors if performed_by is not a valid UUID
        RETURN NEW;
END;
$$;

-- Trigger to update user activity when ticket history is created
CREATE TRIGGER update_user_activity_on_ticket_history
    AFTER INSERT ON public.ticket_history
    FOR EACH ROW
    EXECUTE FUNCTION public.update_user_activity();

-- Function to refresh ticket analytics materialized view
CREATE OR REPLACE FUNCTION public.refresh_ticket_analytics()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
    REFRESH MATERIALIZED VIEW public.ticket_analytics;
END;
$$;
