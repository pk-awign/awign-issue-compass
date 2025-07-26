-- =====================================================
-- BULK TICKET ASSIGNMENT SCRIPT FOR TICKET ADMINS
-- =====================================================

-- This script provides multiple strategies for bulk assigning tickets to ticket admins
-- Usage: Modify the parameters at the top and run the desired strategy

-- =====================================================
-- CONFIGURATION PARAMETERS (MODIFY THESE)
-- =====================================================

-- Strategy 1: Assign by specific ticket admin mobile number
DO $$
DECLARE
    target_mobile VARCHAR := '9876543220';  -- Change this to target admin's mobile
    tickets_per_admin INTEGER := 50;        -- Number of tickets to assign
    assignment_strategy VARCHAR := 'RANDOM'; -- Options: 'RANDOM', 'BY_CITY', 'BY_STATUS', 'BY_SEVERITY'
END $$;

-- Strategy 2: Assign to multiple admins at once
DO $$
DECLARE
    admin_mobiles VARCHAR[] := ARRAY['9876543220', '9876543221', '9876543222']; -- List of admin mobiles
    tickets_per_admin INTEGER := 30; -- Tickets per admin
    assignment_strategy VARCHAR := 'RANDOM'; -- Assignment strategy
END $$;

-- =====================================================
-- STRATEGY 1: ASSIGN TO SPECIFIC ADMIN
-- =====================================================

CREATE OR REPLACE FUNCTION assign_tickets_to_admin(
    admin_mobile VARCHAR,
    ticket_count INTEGER DEFAULT 50,
    strategy VARCHAR DEFAULT 'RANDOM'
) RETURNS INTEGER AS $$
DECLARE
    admin_user_id UUID;
    ticket_record RECORD;
    counter INTEGER := 0;
    query_text TEXT;
BEGIN
    -- Get the admin's user ID
    SELECT id INTO admin_user_id 
    FROM public.users 
    WHERE mobile_number = admin_mobile AND role = 'ticket_admin';
    
    IF admin_user_id IS NULL THEN
        RAISE EXCEPTION 'Ticket Admin not found with mobile number %', admin_mobile;
    END IF;
    
    RAISE NOTICE 'Found Ticket Admin ID: % for mobile: %', admin_user_id, admin_mobile;
    
    -- Build query based on strategy
    CASE strategy
        WHEN 'RANDOM' THEN
            query_text := 'SELECT id FROM public.tickets WHERE id NOT IN (SELECT ticket_id FROM public.ticket_admin_assignments WHERE ticket_admin_id = $1) ORDER BY RANDOM() LIMIT $2';
        WHEN 'BY_CITY' THEN
            query_text := 'SELECT t.id FROM public.tickets t WHERE t.id NOT IN (SELECT ticket_id FROM public.ticket_admin_assignments WHERE ticket_admin_id = $1) ORDER BY t.city, RANDOM() LIMIT $2';
        WHEN 'BY_STATUS' THEN
            query_text := 'SELECT t.id FROM public.tickets t WHERE t.id NOT IN (SELECT ticket_id FROM public.ticket_admin_assignments WHERE ticket_admin_id = $1) ORDER BY t.status, RANDOM() LIMIT $2';
        WHEN 'BY_SEVERITY' THEN
            query_text := 'SELECT t.id FROM public.tickets t WHERE t.id NOT IN (SELECT ticket_id FROM public.ticket_admin_assignments WHERE ticket_admin_id = $1) ORDER BY t.severity, RANDOM() LIMIT $2';
        ELSE
            RAISE EXCEPTION 'Invalid strategy: %. Use RANDOM, BY_CITY, BY_STATUS, or BY_SEVERITY', strategy;
    END CASE;
    
    -- Execute assignment
    FOR ticket_record IN EXECUTE query_text USING admin_user_id, ticket_count
    LOOP
        INSERT INTO public.ticket_admin_assignments (ticket_id, ticket_admin_id, assigned_by)
        VALUES (ticket_record.id, admin_user_id, admin_user_id)
        ON CONFLICT (ticket_id, ticket_admin_id) DO NOTHING;
        
        counter := counter + 1;
        
        IF counter % 10 = 0 THEN
            RAISE NOTICE 'Assigned % tickets so far...', counter;
        END IF;
    END LOOP;
    
    RAISE NOTICE 'Successfully assigned % tickets to admin % using strategy %', counter, admin_mobile, strategy;
    RETURN counter;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- STRATEGY 2: ASSIGN TO MULTIPLE ADMINS
-- =====================================================

CREATE OR REPLACE FUNCTION assign_tickets_to_multiple_admins(
    admin_mobiles VARCHAR[],
    tickets_per_admin INTEGER DEFAULT 30,
    strategy VARCHAR DEFAULT 'RANDOM'
) RETURNS TABLE(admin_mobile VARCHAR, assigned_count INTEGER) AS $$
DECLARE
    admin_mobile VARCHAR;
    assigned_count INTEGER;
BEGIN
    FOREACH admin_mobile IN ARRAY admin_mobiles
    LOOP
        assigned_count := assign_tickets_to_admin(admin_mobile, tickets_per_admin, strategy);
        RETURN QUERY SELECT admin_mobile, assigned_count;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- STRATEGY 3: ASSIGN BY CITY MATCHING
-- =====================================================

CREATE OR REPLACE FUNCTION assign_tickets_by_city_matching() RETURNS INTEGER AS $$
DECLARE
    admin_record RECORD;
    ticket_record RECORD;
    counter INTEGER := 0;
BEGIN
    -- Assign tickets to admins based on city matching
    FOR admin_record IN 
        SELECT u.id, u.name, u.city, u.mobile_number
        FROM public.users u 
        WHERE u.role = 'ticket_admin'
    LOOP
        FOR ticket_record IN 
            SELECT t.id 
            FROM public.tickets t
            WHERE t.city = admin_record.city 
            AND t.id NOT IN (
                SELECT ticket_id 
                FROM public.ticket_admin_assignments 
                WHERE ticket_admin_id = admin_record.id
            )
            ORDER BY RANDOM() 
            LIMIT 25
        LOOP
            INSERT INTO public.ticket_admin_assignments (ticket_id, ticket_admin_id, assigned_by)
            VALUES (ticket_record.id, admin_record.id, admin_record.id)
            ON CONFLICT (ticket_id, ticket_admin_id) DO NOTHING;
            
            counter := counter + 1;
        END LOOP;
        
        RAISE NOTICE 'Assigned tickets to % in %', admin_record.name, admin_record.city;
    END LOOP;
    
    RETURN counter;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- USAGE EXAMPLES
-- =====================================================

-- Example 1: Assign 50 random tickets to Mumbai Ticket Admin
-- SELECT assign_tickets_to_admin('9876543220', 50, 'RANDOM');

-- Example 2: Assign 30 tickets each to all ticket admins
-- SELECT * FROM assign_tickets_to_multiple_admins(ARRAY['9876543220', '9876543221', '9876543222'], 30, 'RANDOM');

-- Example 3: Assign tickets by city matching
-- SELECT assign_tickets_by_city_matching();

-- Example 4: Assign high severity tickets to specific admin
-- SELECT assign_tickets_to_admin('9876543220', 20, 'BY_SEVERITY');

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================

-- Check assignments for all ticket admins
SELECT 
    u.name as admin_name,
    u.mobile_number,
    u.city,
    COUNT(ta.ticket_id) as assigned_tickets
FROM public.users u
LEFT JOIN public.ticket_admin_assignments ta ON u.id = ta.ticket_admin_id
WHERE u.role = 'ticket_admin'
GROUP BY u.id, u.name, u.mobile_number, u.city
ORDER BY assigned_tickets DESC;

-- Check ticket distribution by status for each admin
SELECT 
    u.name as admin_name,
    t.status,
    COUNT(*) as ticket_count
FROM public.users u
JOIN public.ticket_admin_assignments ta ON u.id = ta.ticket_admin_id
JOIN public.tickets t ON ta.ticket_id = t.id
WHERE u.role = 'ticket_admin'
GROUP BY u.name, t.status
ORDER BY u.name, t.status;

-- Check ticket distribution by severity for each admin
SELECT 
    u.name as admin_name,
    t.severity,
    COUNT(*) as ticket_count
FROM public.users u
JOIN public.ticket_admin_assignments ta ON u.id = ta.ticket_admin_id
JOIN public.tickets t ON ta.ticket_id = t.id
WHERE u.role = 'ticket_admin'
GROUP BY u.name, t.severity
ORDER BY u.name, t.severity; 