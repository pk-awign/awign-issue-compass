# Super Admin All Tickets — Design

## Summary

Standalone super-admin Ticket Center at `/super-admin/all-tickets`, entered via `/super-admin` login. Keeps Admin “Ticket Center” entry. Excludes Open / Pending on CX tickets. Default date filter is previous calendar month. All Tickets tab paginates at 50/page.

## Routes

| Path | Behavior |
|------|----------|
| `/super-admin` | Super Admin login (PIN, no signup). Only `super_admin` succeeds. Success → `/super-admin/all-tickets`. |
| `/super-admin/all-tickets` | Ticket Center dashboard. Super Admin only. Unauthenticated / wrong role → `/super-admin`. Logout → `/super-admin`. |
| `/admin/combined-tickets` | Redirect → `/super-admin/all-tickets` |
| Admin UI “Ticket Center” | **Kept**; navigates to `/super-admin/all-tickets` |

## Dashboard rules

- **Default date range:** previous calendar month (e.g. 11 Aug → 1 Jul–31 Jul). Clear filters restores this.
- **Excluded statuses:** `open` and `in_progress` (Open / Pending on CX) — excluded from the All Tickets list **and** from overview card/chart counts. Open / Pending on CX cards remain visible (typically 0).
- **Pagination:** All Tickets tab, 50 per page, Prev/Next, reset to page 1 on filter change. Overview uses full filtered set.

## Out of scope

- Separate auth stack
- Server-side pagination
- Removing Admin Ticket Center entry
