-- Create the missing ticket_admin_assignments table
-- This script creates the table and then assigns 50 tickets to Mumbai Ticket Admin

-- Step 1: Create the ticket_admin_assignments table
CREATE TABLE IF NOT EXISTS public.ticket_admin_assignments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    ticket_id UUID NOT NULL REFERENCES public.tickets(id) ON DELETE CASCADE,
    ticket_admin_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    assigned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    assigned_by UUID REFERENCES public.users(id),
    UNIQUE(ticket_id, ticket_admin_id)
);

-- Step 2: Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_ticket_admin_assignments_ticket_id ON public.ticket_admin_assignments(ticket_id);
CREATE INDEX IF NOT EXISTS idx_ticket_admin_assignments_admin_id ON public.ticket_admin_assignments(ticket_admin_id);

-- Step 3: Assign 50 random tickets to Mumbai Ticket Admin
DO $$
DECLARE
    admin_user_id UUID;
    ticket_record RECORD;
    counter INTEGER := 0;
    max_tickets INTEGER := 50;
BEGIN
    -- Get the Mumbai Ticket Admin's user ID
    SELECT id INTO admin_user_id 
    FROM public.users 
    WHERE mobile_number = '9876543220' AND role = 'ticket_admin';
    
    IF admin_user_id IS NULL THEN
        RAISE EXCEPTION 'Mumbai Ticket Admin not found with mobile number 9876543220';
    END IF;
    
    RAISE NOTICE 'Found Ticket Admin ID: %', admin_user_id;
    
    -- Assign 50 random tickets to this admin
    FOR ticket_record IN 
        SELECT id 
        FROM public.tickets 
        WHERE id NOT IN (
            SELECT ticket_id 
            FROM public.ticket_admin_assignments 
            WHERE ticket_admin_id = admin_user_id
        )
        ORDER BY RANDOM() 
        LIMIT max_tickets
    LOOP
        -- Insert assignment
        INSERT INTO public.ticket_admin_assignments (ticket_id, ticket_admin_id, assigned_by)
        VALUES (ticket_record.id, admin_user_id, admin_user_id)
        ON CONFLICT (ticket_id, ticket_admin_id) DO NOTHING;
        
        counter := counter + 1;
        
        -- Log progress
        IF counter % 10 = 0 THEN
            RAISE NOTICE 'Assigned % tickets so far...', counter;
        END IF;
    END LOOP;
    
    RAISE NOTICE 'Successfully assigned % tickets to Mumbai Ticket Admin', counter;
END $$;

-- Step 4: Verify the assignments
SELECT 
    u.name as admin_name,
    u.mobile_number,
    COUNT(ta.ticket_id) as assigned_tickets
FROM public.users u
LEFT JOIN public.ticket_admin_assignments ta ON u.id = ta.ticket_admin_id
WHERE u.mobile_number = '9876543220' AND u.role = 'ticket_admin'
GROUP BY u.id, u.name, u.mobile_number; 