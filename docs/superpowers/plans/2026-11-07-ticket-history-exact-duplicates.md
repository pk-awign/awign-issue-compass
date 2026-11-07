# Ticket history exact duplicates — implementation plan

> Implemented locally. Production apply only on explicit ask.

**Goal:** One history row per real event; delete exact duplicates only.

**Done:**

1. Spec: `docs/superpowers/specs/2026-11-07-ticket-history-exact-duplicates-design.md`
2. Migration: `supabase/migrations/20261107143000_fix_history_double_write.sql`
3. App: removed comment `addTicketHistoryEvent` in `src/services/ticketService.ts`
4. Verify: `docs/ops/2026-11-07-ticket-history-exact-duplicates-verify.md`
