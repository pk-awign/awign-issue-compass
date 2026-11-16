-- Status updates fail when ticket_timeline_trigger → log_timeline_event inserts
-- into ticket_timeline under the caller's RLS (anon key; app auth is localStorage).
-- That broke admin bulk assign: open→in_progress aborted before assignees were written.
--
-- 1) Allow anon/authenticated writes on ticket_timeline (match ticket_history / notifications).
-- 2) Run log_timeline_event as SECURITY DEFINER so status triggers can audit reliably.

DROP POLICY IF EXISTS "Allow all operations on ticket_timeline" ON public.ticket_timeline;
CREATE POLICY "Allow all operations on ticket_timeline"
  ON public.ticket_timeline
  FOR ALL
  USING (true)
  WITH CHECK (true);

GRANT ALL ON public.ticket_timeline TO anon;
GRANT ALL ON public.ticket_timeline TO authenticated;
GRANT ALL ON public.ticket_timeline TO service_role;

CREATE OR REPLACE FUNCTION public.log_timeline_event(
    p_ticket_id UUID,
    p_event_type VARCHAR(50),
    p_old_value TEXT DEFAULT NULL,
    p_new_value TEXT DEFAULT NULL,
    p_performed_by UUID DEFAULT NULL,
    p_performed_by_name VARCHAR(255) DEFAULT NULL,
    p_performed_by_role VARCHAR(50) DEFAULT NULL,
    p_details JSONB DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
    INSERT INTO public.ticket_timeline (
        ticket_id, event_type, old_value, new_value,
        performed_by, performed_by_name, performed_by_role, details
    ) VALUES (
        p_ticket_id, p_event_type, p_old_value, p_new_value,
        p_performed_by, p_performed_by_name, p_performed_by_role, p_details
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.log_timeline_event(
  UUID, VARCHAR, TEXT, TEXT, UUID, VARCHAR, VARCHAR, JSONB
) TO anon, authenticated, service_role;
