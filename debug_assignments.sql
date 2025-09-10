-- Debug script to check assignment data after migration
-- This will help us understand why tickets are not visible

-- 1. Check if ticket_assignees table has data
SELECT 
  COUNT(*) as total_assignments,
  COUNT(CASE WHEN role = 'resolver' THEN 1 END) as resolver_assignments,
  COUNT(CASE WHEN role = 'approver' THEN 1 END) as approver_assignments
FROM public.ticket_assignees;

-- 2. Check specific assignments for Arindam (resolver)
SELECT 
  ta.ticket_id,
  t.ticket_number,
  ta.user_id,
  u.name as user_name,
  ta.role,
  ta.assigned_at
FROM public.ticket_assignees ta
JOIN public.tickets t ON ta.ticket_id = t.id
JOIN public.users u ON ta.user_id = u.id
WHERE ta.user_id = '614abdbe-4250-43f3-a1a7-0e757e741d2a' -- Arindam's ID
ORDER BY ta.assigned_at DESC;

-- 3. Check if the problematic ticket has assignments
SELECT 
  ta.ticket_id,
  t.ticket_number,
  ta.user_id,
  u.name as user_name,
  ta.role,
  ta.assigned_at
FROM public.ticket_assignees ta
JOIN public.tickets t ON ta.ticket_id = t.id
JOIN public.users u ON ta.user_id = u.id
WHERE ta.ticket_id = 'd61dcf47-2abe-41bd-ae0f-ca8bf166670e'; -- The problematic ticket

-- 4. Check all assignments for the problematic ticket
SELECT * FROM public.ticket_assignees 
WHERE ticket_id = 'd61dcf47-2abe-41bd-ae0f-ca8bf166670e';

-- 5. Check if the ticket exists
SELECT id, ticket_number, status, created_at 
FROM public.tickets 
WHERE id = 'd61dcf47-2abe-41bd-ae0f-ca8bf166670e';

-- 6. Check Arindam's user details
SELECT id, name, role, city, centre_code 
FROM public.users 
WHERE id = '614abdbe-4250-43f3-a1a7-0e757e741d2a';
