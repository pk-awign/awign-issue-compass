-- Migration: Create other_tickets for external/other-source ticket rows
-- Date: 2026-08-11
--
-- Purpose:
--   Store tickets from external sources (e.g. Google Sheet / CSV) alongside
--   portal tickets, preserving the complete source dataset for future filters
--   and detail views. The Combined Tickets UI may display only a subset.
--
-- Identifier rules:
--   - id            = unique database row (PRIMARY KEY)
--   - ticket_number = business Ticket ID from source; NOT unique
--                    (multiple source rows may share the same Ticket ID)
--
-- Status / category:
--   - status         reuses existing enum ticket_status_new
--   - issue_category reuses the same CHECK values as public.tickets
--   Raw source status/category labels are also stored (assignee_status,
--   cx_status, category) so original values are not lost at seed time.
--   Primary business status for other tickets is cx_status (map → status).
--   internal_remark_1 / internal_remark_2 are Comment 1 / Comment 2.
--
-- Seeding (not performed by this migration):
--   Map source Category → issue_category snake_case values.
--   Map source status / CX Status → ticket_status_new as needed.
--   Parse Created Date → created_at (timestamptz).
--   Example (do not run as part of this migration):
--   -- INSERT INTO public.other_tickets (
--   --   ticket_number, issue_category, description, status, created_at, resource_id,
--   --   category, cx_owner, user_name, exam_date, shift, role, type_of_exam,
--   --   attendance_copy_available, link_to_attendance_copy, assignee, tc_code,
--   --   internal_remark_1, assignee_status, cx_status, internal_remark_2
--   -- ) VALUES (...);

CREATE TABLE IF NOT EXISTS public.other_tickets (
    -- Unique database row identifier (NOT the business Ticket ID)
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Required normalized / business fields
    ticket_number TEXT NOT NULL,
    issue_category TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    status public.ticket_status_new NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    resource_id TEXT NOT NULL DEFAULT '',

    -- Source fields (complete dataset preservation)
    -- Category (raw source label, e.g. "Payment Delay")
    category TEXT,
    -- CX Owner
    cx_owner TEXT,
    -- User name
    user_name TEXT,
    -- Exam Date
    exam_date DATE,
    -- Shift
    shift TEXT,
    -- Role
    role TEXT,
    -- Type of Exam
    type_of_exam TEXT,
    -- Attendance Copy Available (source header: Attendnace Copy Available)
    attendance_copy_available TEXT,
    -- Link to Attendance Copy
    link_to_attendance_copy TEXT,
    -- Assignee
    assignee TEXT,
    -- TC code
    tc_code TEXT,
    -- Internal Remark 1
    internal_remark_1 TEXT,
    -- Status (To be updated by Assignee) — raw source label
    assignee_status TEXT,
    -- CX Status — raw source label
    cx_status TEXT,
    -- Internal Remark 2
    internal_remark_2 TEXT,

    CONSTRAINT other_tickets_issue_category_check CHECK (
        issue_category IN (
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
        )
    )
);

COMMENT ON TABLE public.other_tickets IS
  'External/other-source tickets. id is the unique row key; ticket_number is the business Ticket ID and may repeat across rows.';

COMMENT ON COLUMN public.other_tickets.id IS
  'Unique database row identifier (gen_random_uuid).';

COMMENT ON COLUMN public.other_tickets.ticket_number IS
  'Business Ticket ID from source. NOT unique — multiple rows may share the same Ticket ID.';

COMMENT ON COLUMN public.other_tickets.issue_category IS
  'Normalized category aligned with tickets.issue_category CHECK values.';

COMMENT ON COLUMN public.other_tickets.category IS
  'Raw source Category label (e.g. Payment Delay).';

COMMENT ON COLUMN public.other_tickets.description IS
  'Source Issue Description.';

COMMENT ON COLUMN public.other_tickets.status IS
  'Normalized status using existing ticket_status_new enum.';

COMMENT ON COLUMN public.other_tickets.assignee_status IS
  'Raw source Status (To be updated by Assignee) — assignee-side label, not the primary business status.';

COMMENT ON COLUMN public.other_tickets.cx_status IS
  'Raw source CX Status — this is the actual/primary business status for other tickets. Map into status (ticket_status_new) at seed time.';

COMMENT ON COLUMN public.other_tickets.created_at IS
  'Source ticket Created Date as timestamptz.';

COMMENT ON COLUMN public.other_tickets.resource_id IS
  'Source Resource ID.';

COMMENT ON COLUMN public.other_tickets.cx_owner IS
  'Source CX Owner.';

COMMENT ON COLUMN public.other_tickets.user_name IS
  'Source User name.';

COMMENT ON COLUMN public.other_tickets.exam_date IS
  'Source Exam Date.';

COMMENT ON COLUMN public.other_tickets.shift IS
  'Source Shift.';

COMMENT ON COLUMN public.other_tickets.role IS
  'Source Role.';

COMMENT ON COLUMN public.other_tickets.type_of_exam IS
  'Source Type of Exam.';

COMMENT ON COLUMN public.other_tickets.attendance_copy_available IS
  'Source Attendance Copy Available.';

COMMENT ON COLUMN public.other_tickets.link_to_attendance_copy IS
  'Source Link to Attendance Copy.';

COMMENT ON COLUMN public.other_tickets.assignee IS
  'Source Assignee.';

COMMENT ON COLUMN public.other_tickets.tc_code IS
  'Source TC code.';

COMMENT ON COLUMN public.other_tickets.internal_remark_1 IS
  'Source Internal Remark 1 — Comment 1.';

COMMENT ON COLUMN public.other_tickets.internal_remark_2 IS
  'Source Internal Remark 2 — Comment 2.';

-- Indexes for common filters (ticket_number intentionally non-unique)
CREATE INDEX IF NOT EXISTS idx_other_tickets_ticket_number ON public.other_tickets (ticket_number);
CREATE INDEX IF NOT EXISTS idx_other_tickets_status ON public.other_tickets (status);
CREATE INDEX IF NOT EXISTS idx_other_tickets_created_at ON public.other_tickets (created_at);
CREATE INDEX IF NOT EXISTS idx_other_tickets_resource_id ON public.other_tickets (resource_id);
CREATE INDEX IF NOT EXISTS idx_other_tickets_issue_category ON public.other_tickets (issue_category);

-- RLS: mirror tickets access pattern (database-setup.sql)
ALTER TABLE public.other_tickets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all operations on other_tickets"
  ON public.other_tickets
  FOR ALL
  USING (true);
