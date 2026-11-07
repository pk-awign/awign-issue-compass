-- Fix ticket_history double-writes and remove exact duplicates.
--
-- 1) Restore log_timeline_event to insert into ticket_timeline only
--    (production incorrectly inserted into ticket_history).
-- 2) Auto-resolve / cleanup: rely on tickets + comments triggers for audit;
--    do not manually insert ticket_history or ticket_timeline.
-- 3) Delete exact duplicate ticket_history rows (same ticket/action/values/
--    actor/timestamp), keeping min(id). Soft near-pairs are left alone.

-- ---------------------------------------------------------------------------
-- 1. Restore log_timeline_event → ticket_timeline
-- ---------------------------------------------------------------------------
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

-- ---------------------------------------------------------------------------
-- 2a. auto_resolve_user_dependency_tickets (live logic, no manual audit inserts)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.auto_resolve_user_dependency_tickets()
RETURNS integer
LANGUAGE plpgsql
AS $$
DECLARE
  v_ticket_id uuid;
  v_count integer := 0;
  v_has_recent_user_comment boolean;
  v_has_recent_recent_attachment boolean;
  v_last_comment record;
  v_is_last_comment_internal boolean;
BEGIN
  FOR v_ticket_id IN
    SELECT id
    FROM public.tickets
    WHERE status = 'user_dependency'
      AND user_dependency_started_at < NOW() - INTERVAL '72 hours'
      AND COALESCE(deleted, false) = false
  LOOP
    SELECT EXISTS (
      SELECT 1
      FROM public.comments c
      WHERE c.ticket_id = v_ticket_id
        AND c.created_at >= NOW() - INTERVAL '72 hours'
        AND COALESCE(c.is_internal, false) = false
        AND COALESCE(c.author_role, '') NOT IN ('admin','resolver','approver','super_admin','ticket_admin','system')
    )
    INTO v_has_recent_user_comment;

    SELECT EXISTS (
      SELECT 1
      FROM public.attachments a
      WHERE a.ticket_id = v_ticket_id
        AND a.uploaded_at >= NOW() - INTERVAL '72 hours'
    )
    INTO v_has_recent_recent_attachment;

    IF v_has_recent_user_comment OR v_has_recent_recent_attachment THEN
      CONTINUE;
    END IF;

    SELECT id, is_internal, author_role, created_at
    INTO v_last_comment
    FROM public.comments
    WHERE ticket_id = v_ticket_id
    ORDER BY created_at DESC NULLS LAST, id DESC
    LIMIT 1;

    IF v_last_comment.id IS NULL THEN
      v_is_last_comment_internal := TRUE;
    ELSE
      IF COALESCE(v_last_comment.is_internal, false) = TRUE THEN
        v_is_last_comment_internal := TRUE;
      ELSIF COALESCE(v_last_comment.author_role, '') IN ('admin','resolver','approver','super_admin','ticket_admin','system') THEN
        v_is_last_comment_internal := TRUE;
      ELSE
        v_is_last_comment_internal := FALSE;
      END IF;
    END IF;

    IF v_is_last_comment_internal THEN
      UPDATE public.tickets
      SET
        status = 'resolved',
        resolved_at = NOW(),
        resolved_via = 'auto',
        resolution_notes = '[auto] Closed due to no response from user''s end.',
        status_changed_at = NOW(),
        status_changed_by = NULL,
        updated_at = NOW()
      WHERE id = v_ticket_id
        AND status = 'user_dependency';

      IF FOUND THEN
        -- Status audit: ticket_timeline_trigger → ticket_history + log_timeline_event
        -- Comment audit: log_comment_history trigger → ticket_history
        INSERT INTO public.comments (id, ticket_id, content, author, author_role, is_internal, created_at)
        VALUES (
          gen_random_uuid(),
          v_ticket_id,
          'This ticket is autoclosed due to no response.',
          'System',
          'admin',
          FALSE,
          NOW()
        );

        v_count := v_count + 1;
      END IF;
    END IF;
  END LOOP;

  RETURN v_count;
END;
$$;

-- ---------------------------------------------------------------------------
-- 2b. cleanup_past_user_dependency_tickets (live logic, no manual audit inserts)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.cleanup_past_user_dependency_tickets()
RETURNS integer
LANGUAGE plpgsql
AS $$
DECLARE
  v_ticket_id UUID;
  v_count INTEGER := 0;
  v_last_comment RECORD;
  v_is_last_comment_internal BOOLEAN;
BEGIN
  FOR v_ticket_id IN
    SELECT id
    FROM public.tickets
    WHERE status = 'user_dependency'
      AND (
        (user_dependency_started_at IS NOT NULL AND user_dependency_started_at < NOW() - INTERVAL '72 hours')
        OR (user_dependency_started_at IS NULL AND created_at < NOW() - INTERVAL '72 hours')
      )
      AND deleted = false
  LOOP
    SELECT id, is_internal, author_role, created_at
    INTO v_last_comment
    FROM public.comments
    WHERE ticket_id = v_ticket_id
      AND created_at IS NOT NULL
    ORDER BY created_at DESC, id DESC
    LIMIT 1;

    IF v_last_comment.id IS NULL THEN
      CONTINUE;
    END IF;

    IF v_last_comment.is_internal = TRUE THEN
      v_is_last_comment_internal := TRUE;
    ELSIF COALESCE(v_last_comment.author_role, '') IN ('admin','resolver','approver','super_admin','ticket_admin') THEN
      v_is_last_comment_internal := TRUE;
    ELSE
      v_is_last_comment_internal := FALSE;
    END IF;

    IF v_is_last_comment_internal THEN
      UPDATE public.tickets
      SET
        status = 'resolved',
        resolved_at = NOW(),
        resolution_notes = COALESCE(resolution_notes, '') || E'\n\nThis ticket is autoclosed due to no response.',
        status_changed_at = NOW(),
        status_changed_by = NULL
      WHERE id = v_ticket_id
        AND status = 'user_dependency';

      IF FOUND THEN
        INSERT INTO public.comments (id, ticket_id, content, author, author_role, is_internal, created_at)
        VALUES (
          gen_random_uuid(),
          v_ticket_id,
          'This ticket is autoclosed due to no response.',
          'System',
          'system',
          TRUE,
          NOW()
        );

        v_count := v_count + 1;
      END IF;
    END IF;
  END LOOP;

  RETURN v_count;
END;
$$;

-- ---------------------------------------------------------------------------
-- 3. Exact-duplicate cleanup (dry-run shape documented in ops note)
--
-- Expected pre-delete check:
--   SELECT action_type, COUNT(*) AS exact_dup_groups, SUM(c - 1) AS rows_to_delete
--   FROM (
--     SELECT action_type, COUNT(*) AS c
--     FROM ticket_history
--     GROUP BY ticket_id, action_type, COALESCE(old_value,''), COALESCE(new_value,''),
--              COALESCE(performed_by,''), performed_at
--     HAVING COUNT(*) > 1
--   ) g
--   GROUP BY action_type;
-- ---------------------------------------------------------------------------
DELETE FROM public.ticket_history th
WHERE th.id IN (
  SELECT id
  FROM (
    SELECT
      id,
      ROW_NUMBER() OVER (
        PARTITION BY
          ticket_id,
          action_type,
          COALESCE(old_value, ''),
          COALESCE(new_value, ''),
          COALESCE(performed_by, ''),
          performed_at
        ORDER BY id
      ) AS rn
    FROM public.ticket_history
  ) ranked
  WHERE ranked.rn > 1
);
