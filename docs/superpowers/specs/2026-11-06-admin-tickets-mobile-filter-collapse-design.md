# Admin All Tickets mobile filter collapse

## Goal

On Admin `/admin` **All Tickets**, collapse the filter panel on phones so tickets are visible without scrolling past a tall filter stack.

## Decisions

- Match `TicketFilters`: Show/Hide on `< md`, always expanded from `md` up.
- Default closed on mobile; active-count badge + Clear stay in the header.
- Modal unification deferred (separate pass).

## Out of scope

- Changing filter query logic, sort, or pagination.
- Unifying `TicketDetailsModal` variants.
- Ticket Admin page filters (unless they share this card later).
