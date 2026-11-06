-- Store archive_status as Yes or No.
-- Yes: submitted_at is before the start of today in Asia/Kolkata, minus 6 months.
-- No: every other ticket.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'tickets'
      AND column_name = 'archive_status'
      AND data_type = 'boolean'
  ) THEN
    ALTER TABLE public.tickets ALTER COLUMN archive_status DROP DEFAULT;
    ALTER TABLE public.tickets
      ALTER COLUMN archive_status TYPE text
      USING (CASE WHEN archive_status THEN 'Yes' ELSE 'No' END);
    ALTER TABLE public.tickets ALTER COLUMN archive_status SET DEFAULT 'No';
    ALTER TABLE public.tickets ALTER COLUMN archive_status SET NOT NULL;
  END IF;
END $$;

ALTER TABLE public.tickets DROP CONSTRAINT IF EXISTS tickets_archive_status_check;
ALTER TABLE public.tickets
  ADD CONSTRAINT tickets_archive_status_check CHECK (archive_status IN ('Yes', 'No'));

COMMENT ON COLUMN public.tickets.archive_status IS
  'Yes when submitted_at is older than 6 calendar months before today in Asia/Kolkata. No for every other ticket.';

CREATE OR REPLACE FUNCTION public.refresh_ticket_archive_status()
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  cutoff timestamptz := public.ticket_archive_cutoff();
BEGIN
  UPDATE public.tickets
  SET archive_status = CASE
    WHEN submitted_at IS NOT NULL AND submitted_at < cutoff THEN 'Yes'
    ELSE 'No'
  END
  WHERE archive_status IS DISTINCT FROM (
    CASE
      WHEN submitted_at IS NOT NULL AND submitted_at < cutoff THEN 'Yes'
      ELSE 'No'
    END
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.set_ticket_archive_status()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.archive_status := CASE
    WHEN NEW.submitted_at IS NOT NULL AND NEW.submitted_at < public.ticket_archive_cutoff() THEN 'Yes'
    ELSE 'No'
  END;
  RETURN NEW;
END;
$$;

SELECT public.refresh_ticket_archive_status();
