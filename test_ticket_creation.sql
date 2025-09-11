-- TEST TICKET CREATION
-- This script tests if ticket creation works after the fix

-- Test creating a simple ticket
INSERT INTO public.tickets (
    ticket_number,
    centre_code,
    city,
    resource_id,
    issue_category,
    issue_description,
    issue_date,
    severity,
    status,
    is_anonymous,
    submitted_by,
    submitted_by_user_id
) VALUES (
    'TEST-' || EXTRACT(EPOCH FROM NOW())::BIGINT,
    '999',
    'Test City',
    'TEST001',
    'technical',
    'Test ticket creation after database fix',
    CURRENT_DATE,
    'medium',
    'open',
    true,
    'Test User',
    NULL
) RETURNING id, ticket_number, status;

-- Check if timeline was created
SELECT 
    th.action_type,
    th.performed_by,
    th.performed_by_role,
    th.details,
    th.created_at
FROM public.ticket_history th
JOIN public.tickets t ON th.ticket_id = t.id
WHERE t.ticket_number LIKE 'TEST-%'
ORDER BY th.created_at DESC
LIMIT 1;

-- Clean up test ticket
DELETE FROM public.tickets 
WHERE ticket_number LIKE 'TEST-%';

DELETE FROM public.ticket_history 
WHERE ticket_id IN (
    SELECT id FROM public.tickets WHERE ticket_number LIKE 'TEST-%'
);

SELECT 'TEST COMPLETED SUCCESSFULLY' AS status;
