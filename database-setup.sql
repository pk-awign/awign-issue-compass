-- Create users table for authentication
CREATE TABLE IF NOT EXISTS public.users (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    mobile_number VARCHAR(15) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    pin_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'public_user' CHECK (role IN ('public_user', 'invigilator', 'supervisor', 'city_owner', 'operations_head')),
    city VARCHAR(100),
    centre_code VARCHAR(100),
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create tickets table
CREATE TABLE IF NOT EXISTS public.tickets (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    ticket_number VARCHAR(50) UNIQUE NOT NULL,
    centre_code VARCHAR(100) NOT NULL,
    city VARCHAR(100) NOT NULL,
    resource_id VARCHAR(100) NOT NULL,
    awign_app_ticket_id VARCHAR(100),
    issue_category VARCHAR(50) NOT NULL CHECK (issue_category IN ('payment_delay', 'partial_payment', 'behavioral_complaint', 'improvement_request', 'facility_issue', 'penalty_issue', 'other')),
    issue_description TEXT NOT NULL,
    issue_date JSONB NOT NULL,
    severity VARCHAR(10) NOT NULL CHECK (severity IN ('sev1', 'sev2', 'sev3')),
    status VARCHAR(20) NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
    is_anonymous BOOLEAN NOT NULL DEFAULT false,
    submitted_by VARCHAR(255),
    submitted_by_user_id UUID REFERENCES public.users(id),
    submitted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    assigned_resolver VARCHAR(100),
    assigned_approver VARCHAR(100),
    resolution_notes TEXT,
    resolved_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create comments table
CREATE TABLE IF NOT EXISTS public.comments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    ticket_id UUID NOT NULL REFERENCES public.tickets(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    author VARCHAR(255) NOT NULL,
    author_role VARCHAR(50) NOT NULL CHECK (author_role IN ('invigilator', 'admin', 'resolver', 'approver')),
    is_internal BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create attachments table
CREATE TABLE IF NOT EXISTS public.attachments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    ticket_id UUID NOT NULL REFERENCES public.tickets(id) ON DELETE CASCADE,
    file_name VARCHAR(255) NOT NULL,
    file_size INTEGER NOT NULL,
    file_type VARCHAR(100) NOT NULL,
    storage_path VARCHAR(500) NOT NULL,
    uploaded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_tickets_ticket_number ON public.tickets(ticket_number);
CREATE INDEX IF NOT EXISTS idx_tickets_city ON public.tickets(city);
CREATE INDEX IF NOT EXISTS idx_tickets_status ON public.tickets(status);
CREATE INDEX IF NOT EXISTS idx_tickets_submitted_by_user_id ON public.tickets(submitted_by_user_id);
CREATE INDEX IF NOT EXISTS idx_tickets_assigned_resolver ON public.tickets(assigned_resolver);
CREATE INDEX IF NOT EXISTS idx_tickets_assigned_approver ON public.tickets(assigned_approver);
CREATE INDEX IF NOT EXISTS idx_comments_ticket_id ON public.comments(ticket_id);
CREATE INDEX IF NOT EXISTS idx_attachments_ticket_id ON public.attachments(ticket_id);

-- Enable Row Level Security (RLS)
ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attachments ENABLE ROW LEVEL SECURITY;

-- Create policies for public access (you can restrict these later)
CREATE POLICY "Allow all operations on tickets" ON public.tickets FOR ALL USING (true);
CREATE POLICY "Allow all operations on comments" ON public.comments FOR ALL USING (true);
CREATE POLICY "Allow all operations on attachments" ON public.attachments FOR ALL USING (true);

-- Create storage bucket for ticket attachments
INSERT INTO storage.buckets (id, name, public) 
VALUES ('ticket-attachments', 'ticket-attachments', true)
ON CONFLICT (id) DO NOTHING;

-- Create storage policy for ticket attachments
CREATE POLICY "Allow all operations on ticket attachments" ON storage.objects
FOR ALL USING (bucket_id = 'ticket-attachments');

-- Add indexes for users table
CREATE INDEX IF NOT EXISTS idx_users_mobile_number ON public.users(mobile_number);
CREATE INDEX IF NOT EXISTS idx_users_role ON public.users(role);

-- Enable RLS for users table
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Create policy for users table
CREATE POLICY "Allow all operations on users" ON public.users FOR ALL USING (true);
