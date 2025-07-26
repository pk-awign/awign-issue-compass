-- =====================================================
-- CHECK AND APPLY PENDING MIGRATIONS (FIXED VERSION)
-- =====================================================

-- Step 1: Check if ticket_admin_assignments table exists
SELECT 
    CASE 
        WHEN EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = 'ticket_admin_assignments'
        ) THEN 'EXISTS' 
        ELSE 'MISSING' 
    END as ticket_admin_assignments_table_status;

-- Step 2: Check if ticket_admin role exists in users table
SELECT 
    CASE 
        WHEN EXISTS (
            SELECT FROM information_schema.table_constraints 
            WHERE constraint_name = 'users_role_check'
        ) THEN 'EXISTS' 
        ELSE 'MISSING' 
    END as users_role_check_constraint_status;

-- Step 3: Check current allowed roles in the constraint
SELECT 
    conname,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conname = 'users_role_check';

-- Step 4: Check if sample ticket admin users exist
SELECT 
    name,
    mobile_number,
    role,
    is_active
FROM public.users 
WHERE role = 'ticket_admin';

-- Step 5: Check if any ticket_admin_assignments exist (only if table exists)
DO $$
BEGIN
    IF EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'ticket_admin_assignments'
    ) THEN
        RAISE NOTICE 'ticket_admin_assignments table exists, checking assignments...';
        -- This will only run if the table exists
        PERFORM COUNT(*) FROM public.ticket_admin_assignments;
    ELSE
        RAISE NOTICE 'ticket_admin_assignments table does not exist yet';
    END IF;
END $$;

-- =====================================================
-- APPLY MISSING MIGRATIONS
-- =====================================================

-- Create ticket_admin_assignments table if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'ticket_admin_assignments'
    ) THEN
        -- Create the table
        CREATE TABLE public.ticket_admin_assignments (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            ticket_id UUID NOT NULL REFERENCES public.tickets(id) ON DELETE CASCADE,
            ticket_admin_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
            assigned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
            assigned_by UUID REFERENCES public.users(id),
            UNIQUE(ticket_id, ticket_admin_id)
        );
        
        -- Create indexes
        CREATE INDEX idx_ticket_admin_assignments_ticket_id ON public.ticket_admin_assignments(ticket_id);
        CREATE INDEX idx_ticket_admin_assignments_admin_id ON public.ticket_admin_assignments(ticket_admin_id);
        
        RAISE NOTICE '✅ Created ticket_admin_assignments table';
    ELSE
        RAISE NOTICE 'ℹ️ ticket_admin_assignments table already exists';
    END IF;
END $$;

-- Update users_role_check constraint to include ticket_admin
DO $$
BEGIN
    -- Drop existing constraint
    ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_role_check;
    
    -- Add updated constraint
    ALTER TABLE public.users ADD CONSTRAINT users_role_check 
    CHECK (role IN ('invigilator', 'resolver', 'approver', 'super_admin', 'ticket_admin'));
    
    RAISE NOTICE '✅ Updated users_role_check constraint to include ticket_admin';
END $$;

-- Insert sample ticket admin users if they don't exist
DO $$
DECLARE
    inserted_count INTEGER := 0;
BEGIN
    INSERT INTO public.users (name, role, city, centre_code, mobile_number, is_active, pin_hash, pin) VALUES
    ('Mumbai Ticket Admin', 'ticket_admin', 'Mumbai', 'MUM001', '9876543220', true, 'default_pin_hash', '5678'),
    ('Delhi Ticket Admin', 'ticket_admin', 'Delhi', 'DEL001', '9876543221', true, 'default_pin_hash', '6789'),
    ('Kolkata Ticket Admin', 'ticket_admin', 'Kolkata', 'KOL001', '9876543222', true, 'default_pin_hash', '7890')
    ON CONFLICT (mobile_number) DO NOTHING;
    
    GET DIAGNOSTICS inserted_count = ROW_COUNT;
    RAISE NOTICE '✅ Inserted % new ticket admin users', inserted_count;
END $$;

-- =====================================================
-- FINAL VERIFICATION
-- =====================================================

-- Check final status
SELECT 'FINAL STATUS CHECK' as status_check;

-- Verify table exists
SELECT 
    'ticket_admin_assignments table' as item,
    CASE 
        WHEN EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = 'ticket_admin_assignments'
        ) THEN '✅ EXISTS' 
        ELSE '❌ MISSING' 
    END as status;

-- Verify constraint includes ticket_admin
SELECT 
    'users_role_check constraint' as item,
    CASE 
        WHEN pg_get_constraintdef(oid) LIKE '%ticket_admin%' 
        THEN '✅ INCLUDES ticket_admin' 
        ELSE '❌ MISSING ticket_admin' 
    END as status
FROM pg_constraint 
WHERE conname = 'users_role_check';

-- Verify sample users exist
SELECT 
    'Sample ticket admin users' as item,
    CASE 
        WHEN COUNT(*) >= 3 THEN '✅ EXISTS (' || COUNT(*) || ' users)' 
        ELSE '❌ MISSING (' || COUNT(*) || ' users)' 
    END as status
FROM public.users 
WHERE role = 'ticket_admin';

-- Check assignments (only if table exists)
DO $$
BEGIN
    IF EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'ticket_admin_assignments'
    ) THEN
        RAISE NOTICE 'Current ticket_admin_assignments: %', (SELECT COUNT(*) FROM public.ticket_admin_assignments);
    END IF;
END $$; 