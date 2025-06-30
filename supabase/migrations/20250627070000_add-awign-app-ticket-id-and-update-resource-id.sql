-- Migration: Add Awign App Ticket ID and update Resource ID requirements
-- Date: 2025-06-27

-- 1. Add awign_app_ticket_id column to tickets table
ALTER TABLE public.tickets 
ADD COLUMN IF NOT EXISTS awign_app_ticket_id VARCHAR(100);

-- 2. Update issue_category check constraint to include new issue types
ALTER TABLE public.tickets 
DROP CONSTRAINT IF EXISTS tickets_issue_category_check;

ALTER TABLE public.tickets 
ADD CONSTRAINT tickets_issue_category_check 
CHECK (issue_category IN ('payment_delay', 'partial_payment', 'behavioral_complaint', 'improvement_request', 'facility_issue', 'penalty_issue', 'other'));

-- 3. Make resource_id NOT NULL (this will fail if there are existing NULL values)
-- First, update any existing NULL resource_id values to a default value
UPDATE public.tickets 
SET resource_id = 'NOT_SPECIFIED' 
WHERE resource_id IS NULL;

-- Then make the column NOT NULL
ALTER TABLE public.tickets 
ALTER COLUMN resource_id SET NOT NULL;

-- 4. Add index for awign_app_ticket_id for better query performance
CREATE INDEX IF NOT EXISTS idx_tickets_awign_app_ticket_id ON public.tickets(awign_app_ticket_id);

-- 5. Update any existing tickets that might have NULL resource_id (safety check)
-- This should not affect any rows since we updated them above, but it's a safety measure
UPDATE public.tickets 
SET resource_id = 'NOT_SPECIFIED' 
WHERE resource_id IS NULL OR resource_id = '';

-- 6. Add comment to document the changes
COMMENT ON COLUMN public.tickets.awign_app_ticket_id IS 'Optional Awign App Ticket ID for cross-referencing with the main Awign application';
COMMENT ON COLUMN public.tickets.resource_id IS 'Required Resource ID for the person reporting the issue'; 