# Verify ticket_history exact-duplicate fix

Local migration: `supabase/migrations/20261107143000_fix_history_double_write.sql`  
**Do not apply to production until explicitly requested.**

## Pre-apply (read-only) counts

```sql
SELECT action_type, COUNT(*) AS exact_dup_groups, SUM(c - 1)::int AS rows_to_delete
FROM (
  SELECT action_type, COUNT(*) AS c
  FROM ticket_history
  GROUP BY ticket_id, action_type, COALESCE(old_value,''), COALESCE(new_value,''),
           COALESCE(performed_by,''), performed_at
  HAVING COUNT(*) > 1
) g
GROUP BY action_type
ORDER BY rows_to_delete DESC;
```

Expect mainly `status_change` and `created`.

Confirm `log_timeline_event` currently targets history (broken) vs timeline (fixed):

```sql
SELECT pg_get_functiondef('public.log_timeline_event'::regproc);
```

## Apply (only when asked)

```bash
npx supabase db query --remote -f supabase/migrations/20261107143000_fix_history_double_write.sql
# or: npx supabase db push --linked   # if migration history is in sync
```

## Post-apply checks

Exact-dup groups should be empty:

```sql
SELECT action_type, COUNT(*) AS exact_dup_groups, SUM(c - 1)::int AS rows_to_delete
FROM (
  SELECT action_type, COUNT(*) AS c
  FROM ticket_history
  GROUP BY ticket_id, action_type, COALESCE(old_value,''), COALESCE(new_value,''),
           COALESCE(performed_by,''), performed_at
  HAVING COUNT(*) > 1
) g
GROUP BY action_type;
```

`log_timeline_event` must `INSERT INTO public.ticket_timeline`.

## Smoke checklist (after apply)

1. **Create ticket** → one `created` row in `ticket_history` for that ticket; optional matching row in `ticket_timeline`.
2. **Status change** → one `status_change` history row.
3. **Add comment** (app) → one `comment_added` history row (trigger only).
4. **Assign resolver** → one `assignment` history row (app).
5. Activity Log + ticket details Timeline: no twin lines for those actions.
6. Auto-resolve still resolves eligible tickets (manual RPC smoke if needed); history should show one status_change + one comment_added from triggers, not extra manual inserts.
