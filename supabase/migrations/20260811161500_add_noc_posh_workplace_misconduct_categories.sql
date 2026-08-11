-- Migration: Add NOC, POSH, Workplace Misconduct issue categories
-- Date: 2026-08-11
--
-- Local-first: apply only when approved. Updates CHECK constraints on
-- tickets.issue_category and other_tickets.issue_category.

ALTER TABLE public.tickets
  DROP CONSTRAINT IF EXISTS tickets_issue_category_check;

ALTER TABLE public.tickets
  ADD CONSTRAINT tickets_issue_category_check
  CHECK (issue_category IN (
    'payment_delay',
    'partial_payment',
    'behavioral_complaint',
    'improvement_request',
    'facility_issue',
    'penalty_issue',
    'malpractice',
    'app_issue',
    'noc',
    'posh',
    'workplace_misconduct',
    'other'
  ));

ALTER TABLE public.other_tickets
  DROP CONSTRAINT IF EXISTS other_tickets_issue_category_check;

ALTER TABLE public.other_tickets
  ADD CONSTRAINT other_tickets_issue_category_check
  CHECK (issue_category IN (
    'payment_delay',
    'partial_payment',
    'behavioral_complaint',
    'improvement_request',
    'facility_issue',
    'penalty_issue',
    'malpractice',
    'app_issue',
    'noc',
    'posh',
    'workplace_misconduct',
    'other'
  ));

COMMENT ON COLUMN public.tickets.issue_category IS
  'Issue category including: payment_delay, partial_payment, behavioral_complaint, improvement_request, facility_issue, penalty_issue, malpractice, app_issue, noc, posh, workplace_misconduct, other';

COMMENT ON COLUMN public.other_tickets.issue_category IS
  'Normalized category aligned with tickets.issue_category CHECK values (includes noc, posh, workplace_misconduct).';
