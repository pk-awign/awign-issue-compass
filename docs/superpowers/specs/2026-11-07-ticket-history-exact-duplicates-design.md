# Ticket history exact duplicates

## Goal

One real ticket event → one `ticket_history` row going forward. Remove only **exact** historical duplicates. Soft near-pairs (different timestamps) are out of cleanup scope.

## Exact duplicate definition

Rows that share all of:

- `ticket_id`
- `action_type`
- `old_value` / `new_value` (null-safe)
- `performed_by` (null-safe)
- `performed_at` (identical)

Keep `min(id)`; delete the rest.

Observed in prod (read-only): exact dups are `status_change` and `created` only.

## Forward write owners

| Event | Owner |
|-------|--------|
| Ticket created / status change | `ticket_timeline_trigger` → one `ticket_history` insert; `log_timeline_event` → `ticket_timeline` only |
| Comment added | `log_comment_history` trigger only (app must not also insert) |
| Assignment / severity | App `addTicketHistoryEvent` (no covering DB trigger) |
| Auto-resolve | `UPDATE tickets` + comment insert; rely on triggers — no manual history/timeline inserts |

## Root cause

Production `log_timeline_event` incorrectly inserted into `ticket_history` instead of `ticket_timeline`, so the tickets trigger wrote history twice with the same timestamp.

## Out of scope

- Deleting soft near-pairs (e.g. comment rows ~0.2–0.5s apart)
- Dropping `ticket_timeline`
- Changing status/assignment/notification business rules
- Applying to production without an explicit ask
