# Admin Tickets Sort By — Design

## Summary

Add Sort by + Asc/Desc controls on `/admin?tab=tickets` so admins can order the All Tickets list by Created, Updated, or Ticket#. Sorting is applied server-side in AdminService queries so pagination stays correct.

## Decisions

| Topic | Choice |
|-------|--------|
| Sort fields | Created, Updated, Ticket# |
| Updated meaning | `updated_at` |
| Direction | Separate Asc / Desc control |
| Default | Created + Desc (current behavior) |
| Approach | Server-side `.order(...)` in list queries |
| Clear Filters | Does **not** reset sort |

## UI

On the tickets tab filters/actions row:

- **Sort by** select: Created | Updated | Ticket#
- **Direction** select: Asc | Desc
- Changing either resets to page 1 and reloads the list
- Same controls for ticket-admin assigned list and super-admin all/filtered lists

## Data mapping

| UI label | DB column |
|----------|-----------|
| Created | `submitted_at` |
| Updated | `updated_at` |
| Ticket# | `ticket_number` |

Ticket# uses Postgres string order on the stored `ticket_number` value. No schema or migration changes.

## Service wiring

- Extend `TicketFilters` with optional `sortBy` / `sortDir`
- Pass sort options into:
  - `getAllTickets`
  - `getAllTicketsUnpaginated`
  - `getFilteredTicketsUnpaginated`
  - `getTicketsAssignedToAdmin`
- Apply `.order(column, { ascending })` before range/pagination
- When omitted, keep today’s default: `submitted_at` descending

## AdminPage wiring

- State: `sortBy` (`created` | `updated` | `ticketNumber`), `sortDir` (`asc` | `desc`)
- Defaults: `created` + `desc`
- Include in `loadTickets` callback deps and filter-change reload effect
- Pass into AdminService calls used by the tickets tab

## Out of scope

- Resolver / Approver pages
- Export / download ordering
- Analytics / overview cards
- DB migrations
- Changing archive or deleted filter behavior
