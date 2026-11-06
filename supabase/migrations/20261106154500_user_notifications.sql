-- Durable in-app notifications for ticket assignees when invigilators comment.

CREATE TABLE IF NOT EXISTS public.user_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  ticket_id UUID NOT NULL REFERENCES public.tickets(id) ON DELETE CASCADE,
  comment_id UUID NOT NULL REFERENCES public.comments(id) ON DELETE CASCADE,
  ticket_number TEXT NOT NULL,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  read_at TIMESTAMPTZ NULL,
  CONSTRAINT user_notifications_user_comment_unique UNIQUE (user_id, comment_id)
);

CREATE INDEX IF NOT EXISTS idx_user_notifications_user_created
  ON public.user_notifications (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_user_notifications_user_unread
  ON public.user_notifications (user_id)
  WHERE read_at IS NULL;

ALTER TABLE public.user_notifications ENABLE ROW LEVEL SECURITY;

-- App auth is localStorage-based (not auth.uid()); match existing open policies.
DROP POLICY IF EXISTS "Allow all operations on user_notifications" ON public.user_notifications;
CREATE POLICY "Allow all operations on user_notifications"
  ON public.user_notifications
  FOR ALL
  USING (true)
  WITH CHECK (true);

GRANT ALL ON public.user_notifications TO authenticated;
GRANT ALL ON public.user_notifications TO anon;
GRANT ALL ON public.user_notifications TO service_role;

CREATE OR REPLACE FUNCTION public.notify_assignees_on_invigilator_comment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ticket_number TEXT;
  v_is_invigilator BOOLEAN;
BEGIN
  v_is_invigilator :=
    NEW.author_role = 'invigilator'
    OR NEW.author_role = 'anonymous'
    OR lower(coalesce(NEW.author, '')) = 'anonymous';

  IF NOT v_is_invigilator THEN
    RETURN NEW;
  END IF;

  SELECT t.ticket_number INTO v_ticket_number
  FROM public.tickets t
  WHERE t.id = NEW.ticket_id;

  IF v_ticket_number IS NULL THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.user_notifications (
    user_id,
    ticket_id,
    comment_id,
    ticket_number,
    body,
    created_at
  )
  SELECT
    ta.user_id,
    NEW.ticket_id,
    NEW.id,
    v_ticket_number,
    NEW.content,
    coalesce(NEW.created_at, now())
  FROM public.ticket_assignees ta
  WHERE ta.ticket_id = NEW.ticket_id
  ON CONFLICT (user_id, comment_id) DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_assignees_on_invigilator_comment ON public.comments;
CREATE TRIGGER trg_notify_assignees_on_invigilator_comment
  AFTER INSERT ON public.comments
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_assignees_on_invigilator_comment();

-- Realtime for live bell updates (ignore if already added).
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.user_notifications;
EXCEPTION
  WHEN duplicate_object THEN NULL;
  WHEN undefined_object THEN NULL;
END $$;
