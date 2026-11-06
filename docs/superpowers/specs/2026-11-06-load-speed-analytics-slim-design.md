# Slim ticket analytics fetch

## Goal

Speed up Admin Overview / Analytics by not hydrating full `Issue` rows (descriptions, empty comment arrays, etc.) when only aggregates are needed.

## Approach (no new RPC required for v1)

- Batch-fetch tickets with a **narrow column select** (`id`, status, severity, city, centre, category, submitted_at, resolved_at, sla flag, archive).
- Batch-fetch assignees as `ticket_id, user_id, role` only.
- Keep existing JS aggregation + `categoryBreakdown` / `createdByDate`.

## Follow-up (optional)

True SQL/RPC aggregates for even faster overview when ready to apply a migration to the linked Supabase project.
