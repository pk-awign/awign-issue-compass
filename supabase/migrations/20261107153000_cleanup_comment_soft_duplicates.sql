-- Remove soft near-pair comment_added rows in ticket_history.
-- Same ticket + author + comment text within 2 seconds (trigger + former app double-write).
-- Prefer keeping the trigger row (details.comment_id); otherwise keep min(id).
-- Does not delete legitimate distinct comments or exact-dup groups already cleaned.

DELETE FROM public.ticket_history
WHERE id IN (
  SELECT DISTINCT loser.id
  FROM public.ticket_history loser
  JOIN public.ticket_history winner
    ON loser.ticket_id = winner.ticket_id
   AND loser.action_type = 'comment_added'
   AND winner.action_type = 'comment_added'
   AND loser.performed_by IS NOT DISTINCT FROM winner.performed_by
   AND loser.new_value IS NOT DISTINCT FROM winner.new_value
   AND loser.id <> winner.id
   AND ABS(EXTRACT(EPOCH FROM (loser.performed_at - winner.performed_at))) < 2
   AND (
     ((winner.details ? 'comment_id') AND NOT COALESCE((loser.details ? 'comment_id'), false))
     OR (
       COALESCE((winner.details ? 'comment_id'), false) = COALESCE((loser.details ? 'comment_id'), false)
       AND winner.id < loser.id
     )
   )
);
