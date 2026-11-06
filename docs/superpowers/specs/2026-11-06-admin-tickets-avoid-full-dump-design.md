# Admin All Tickets: avoid full-corpus dump for status cards

## Goal

When All Tickets loads without filters, do **not** call `getAllTicketsUnpaginated` just to populate status-count cards.

## Approach

- Keep paginated `getAllTickets` for the table page.
- On reset (unfiltered), fetch a **slim** `{ id, status }` (or status counts) set for the eight status cards instead of full Issue rows.
- Filtered views can keep the existing filtered unpaginated path for now (still needed for some client-only filters); follow-up can push those server-side.
