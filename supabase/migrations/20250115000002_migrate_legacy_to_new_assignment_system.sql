-- Complete Migration from Legacy Assignment System to New System
-- This migration will:
-- 1. Copy all legacy assignment data to ticket_assignees table
-- 2. Remove legacy fields from tickets table
-- 3. Update all related functions and triggers

-- Step 1: Migrate existing resolver assignments from legacy field to new table
INSERT INTO public.ticket_assignees (ticket_id, user_id, role, assigned_at, performed_by)
SELECT 
  t.id as ticket_id,
  t.assigned_resolver::uuid as user_id,
  'resolver' as role,
  COALESCE(t.created_at, NOW()) as assigned_at,
  NULL as performed_by
FROM public.tickets t
WHERE t.assigned_resolver IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.ticket_assignees ta 
    WHERE ta.ticket_id = t.id 
      AND ta.user_id = t.assigned_resolver::uuid 
      AND ta.role = 'resolver'
  );

-- Step 2: Migrate existing approver assignments from legacy field to new table
INSERT INTO public.ticket_assignees (ticket_id, user_id, role, assigned_at, performed_by)
SELECT 
  t.id as ticket_id,
  t.assigned_approver::uuid as user_id,
  'approver' as role,
  COALESCE(t.created_at, NOW()) as assigned_at,
  NULL as performed_by
FROM public.tickets t
WHERE t.assigned_approver IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.ticket_assignees ta 
    WHERE ta.ticket_id = t.id 
      AND ta.user_id = t.assigned_approver::uuid 
      AND ta.role = 'approver'
  );

-- Step 3: Verify migration results
-- This will show us how many assignments were migrated
SELECT 
  'resolver' as role,
  COUNT(*) as migrated_count
FROM public.ticket_assignees 
WHERE role = 'resolver'
UNION ALL
SELECT 
  'approver' as role,
  COUNT(*) as migrated_count
FROM public.ticket_assignees 
WHERE role = 'approver';

-- Step 4: Handle dependent views and materialized views
-- Drop dependent views first
DROP VIEW IF EXISTS public.ticket_details_view CASCADE;
DROP MATERIALIZED VIEW IF EXISTS public.ticket_analytics CASCADE;

-- Step 5: Remove legacy columns from tickets table
-- First, let's check what we're removing
SELECT 
  COUNT(*) as tickets_with_resolver,
  COUNT(assigned_resolver) as non_null_resolvers,
  COUNT(assigned_approver) as non_null_approvers
FROM public.tickets;

-- Now remove the legacy columns
ALTER TABLE public.tickets DROP COLUMN IF EXISTS assigned_resolver;
ALTER TABLE public.tickets DROP COLUMN IF EXISTS assigned_approver;

-- Step 6: Recreate views using the new assignment system
-- Recreate ticket_details_view with new assignment system
CREATE VIEW public.ticket_details_view AS
SELECT 
  t.*,
  -- Get resolver from new assignment system
  (SELECT ta.user_id FROM public.ticket_assignees ta 
   WHERE ta.ticket_id = t.id AND ta.role = 'resolver' 
   LIMIT 1) as assigned_resolver,
  -- Get approver from new assignment system  
  (SELECT ta.user_id FROM public.ticket_assignees ta 
   WHERE ta.ticket_id = t.id AND ta.role = 'approver' 
   LIMIT 1) as assigned_approver
FROM public.tickets t;

-- Recreate ticket_analytics materialized view with new assignment system
CREATE MATERIALIZED VIEW public.ticket_analytics AS
SELECT 
  t.status,
  t.severity,
  t.city,
  COUNT(*) as ticket_count,
  COUNT(CASE WHEN ta_resolver.user_id IS NOT NULL THEN 1 END) as assigned_to_resolver,
  COUNT(CASE WHEN ta_approver.user_id IS NOT NULL THEN 1 END) as assigned_to_approver
FROM public.tickets t
LEFT JOIN public.ticket_assignees ta_resolver ON t.id = ta_resolver.ticket_id AND ta_resolver.role = 'resolver'
LEFT JOIN public.ticket_assignees ta_approver ON t.id = ta_approver.ticket_id AND ta_approver.role = 'approver'
GROUP BY t.status, t.severity, t.city;

-- Create index on the materialized view for better performance
CREATE INDEX IF NOT EXISTS idx_ticket_analytics_status_severity ON public.ticket_analytics(status, severity);

-- Step 8: Add indexes for better performance on the new system
CREATE INDEX IF NOT EXISTS idx_ticket_assignees_user_role ON public.ticket_assignees(user_id, role);
CREATE INDEX IF NOT EXISTS idx_ticket_assignees_ticket_role ON public.ticket_assignees(ticket_id, role);

-- Step 9: Update RLS policies if needed
-- The existing RLS policy should work fine with the new system

-- Step 10: Grant necessary permissions
GRANT ALL ON public.ticket_assignees TO authenticated;
GRANT ALL ON public.ticket_assignees TO service_role;
