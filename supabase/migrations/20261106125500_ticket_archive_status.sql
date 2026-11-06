-- archive_status is true when submitted_at is before the start of today
-- in Asia/Kolkata, minus 6 months. Null submitted_at stays current (false).
-- The trigger covers inserts and submitted_at edits. The daily job covers
-- tickets that cross the line because the calendar moved.

ALTER TABLE public.tickets
  ADD COLUMN IF NOT EXISTS archive_status boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.tickets.archive_status IS
  'True when submitted_at is older than 6 calendar months before today in Asia/Kolkata. Maintained by trigger and daily job.';

CREATE OR REPLACE FUNCTION public.ticket_archive_cutoff()
RETURNS timestamptz
LANGUAGE sql
STABLE
AS $$
  SELECT (date_trunc('day', now() AT TIME ZONE 'Asia/Kolkata') AT TIME ZONE 'Asia/Kolkata')
         - interval '6 months';
$$;

CREATE OR REPLACE FUNCTION public.refresh_ticket_archive_status()
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  cutoff timestamptz := public.ticket_archive_cutoff();
BEGIN
  UPDATE public.tickets
  SET archive_status = (submitted_at IS NOT NULL AND submitted_at < cutoff)
  WHERE archive_status IS DISTINCT FROM (submitted_at IS NOT NULL AND submitted_at < cutoff);
END;
$$;

CREATE OR REPLACE FUNCTION public.set_ticket_archive_status()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.archive_status := (NEW.submitted_at IS NOT NULL AND NEW.submitted_at < public.ticket_archive_cutoff());
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tickets_set_archive_status ON public.tickets;

CREATE TRIGGER tickets_set_archive_status
BEFORE INSERT OR UPDATE OF submitted_at
ON public.tickets
FOR EACH ROW
EXECUTE FUNCTION public.set_ticket_archive_status();

SELECT public.refresh_ticket_archive_status();

CREATE INDEX IF NOT EXISTS tickets_archive_status_deleted_idx
  ON public.tickets (deleted, archive_status);

CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;

DO $$
DECLARE
  existing_job bigint;
BEGIN
  SELECT jobid INTO existing_job
  FROM cron.job
  WHERE jobname = 'refresh-ticket-archive-status';

  IF existing_job IS NOT NULL THEN
    PERFORM cron.unschedule(existing_job);
  END IF;

  -- 00:05 Asia/Kolkata
  PERFORM cron.schedule(
    'refresh-ticket-archive-status',
    '35 18 * * *',
    'SELECT public.refresh_ticket_archive_status()'
  );
END $$;
