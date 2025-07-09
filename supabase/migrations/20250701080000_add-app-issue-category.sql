-- Migration: Add App Issue category to issue_category constraint
-- Date: 2025-07-01

-- Update issue_category check constraint to include app_issue and malpractice categories
ALTER TABLE public.tickets 
DROP CONSTRAINT IF EXISTS tickets_issue_category_check;

ALTER TABLE public.tickets 
ADD CONSTRAINT tickets_issue_category_check 
CHECK (issue_category IN ('payment_delay', 'partial_payment', 'behavioral_complaint', 'improvement_request', 'facility_issue', 'penalty_issue', 'malpractice', 'app_issue', 'other'));

-- Add comment to document the new category
COMMENT ON COLUMN public.tickets.issue_category IS 'Issue category including: payment_delay, partial_payment, behavioral_complaint, improvement_request, facility_issue, penalty_issue, malpractice, app_issue, other'; 