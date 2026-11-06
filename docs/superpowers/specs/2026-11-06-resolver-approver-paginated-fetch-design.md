# Resolver / Approver Paginated Fetch — Design

## Summary

Stop loading and rendering the full ticket corpus on `/ticket-resolver` and `/resolution-approver`. Each page owns a paginated, role-scoped list fetch plus accurate status-tab counts that respect the same Filters as the list. Super Admin may keep using these pages as oversight views, also paginated.

## Decisions

| Topic | Choice |
|-------|--------|
| Depth | Role-scoped fetch + pagination (A2) |
| Super Admin on these pages | Keep access; paginate + server-filter (S1) |
| Tab badge counts | Accurate aggregates; **same Filters as the list** (C1) |
| Implementation shape | Page-local fetch via TicketService; do not use `IssueContext.issues` as the list source (Option 1) |
| Page size | 50 (match Admin) |
| Default sort | `submitted_at` descending |
| Stats cards | Drive simple totals from count map; do not require full-list rows for avg / last-24h in v1 |

## Problem

Today both pages pull every ticket through `IssueContext.refreshIssues()` (batched full-table read with comments/attachments), filter in memory, and render every matching card. As Super Admin this yields thousands of DOM nodes and multi-second loads. Real resolvers/approvers with large Closed buckets hit the same pattern.

## Architecture

1. **Page-owned state** on Resolver and Approver: `tickets`, `page`, `total`, `statusCounts`, `listLoading`, existing filter/tab state.
2. **Do not** drive the ticket list from `useIssues().issues`. Keep `IssueContext` for create/update helpers and Track; stop using `refreshIssues()` as the primary list loader on these two pages.
3. On mount, status-tab change, filter change/clear, or page change → call TicketService list + counts.
4. After modal status/comment success → refetch **current page + counts** only (if the page becomes empty and `page > 1`, step back one page and refetch).

```
Filters + status tab + page
        │
        ├─► getRoleTicketPage(...)     → tickets[], total
        └─► getRoleTicketStatusCounts(...) → badge map (filters applied, no status tab)
```

## UI

- Keep existing status tabs and ticket cards.
- Add pagination under the list: Prev / Next and “Showing X–Y of Z” (Admin-style).
- Changing tab, any filter, or Clear → reset to page 1; refetch list + counts.
- Empty state per tab when `total === 0` for that tab+filter combo.
- Loading: list-area spinner/skeleton; keep header/tabs mounted.
- Errors: toast; keep prior list when possible; show retry in the list area.

### Tab counts vs list

- **Badges:** assignee scope (or all tickets for Super Admin) + **current Filters**. Not narrowed by the active status tab (so every tab still shows its filtered count).
- **List:** same scope + Filters + **active status tab** + pagination.

## Service API

Add to `TicketService` (Admin-like pagination, without expanding IssueContext):

### `getRoleTicketPage(params)`

| Param | Notes |
|-------|--------|
| `role` | `resolver` \| `approver` \| `super_admin` |
| `userId` | Required for resolver/approver assignee match |
| `statusTab` | `all` or a concrete status / approver bucket |
| filters | Existing page filters: search, resource IDs, date range, severity, category, city, last-status / last-comment where already supported |
| `page`, `limit` | Default limit 50 |
| returns | `{ tickets: Issue[]; total: number }` |

### `getRoleTicketStatusCounts(params)`

Same scope + filters as the list call, **without** `statusTab`. Returns a map for badges, e.g. resolver `{ all, in_progress, user_dependency, ops_input_required, ops_user_dependency, send_for_approval, approved, resolved }` and the Approver page’s existing bucket keys.

### Assignee scoping

- **Resolver:** tickets where the user is in `ticket_assignees` with role `resolver`.
- **Approver:** same with role `approver`.
- **Super Admin:** no assignee filter.

### Sort

Default `.order('submitted_at', { ascending: false })`. No new sort UI in this change.

## Stats cards

`TicketStatsCards` today expects a full ticket array. For v1:

- Pass or derive simple totals (total / open / pending / closed) from `statusCounts`.
- Avg resolution time and last-24h new tickets may show N/A or be omitted until a dedicated lightweight stats query exists.
- Do not reintroduce a full-list fetch to feed stats.

## Realtime

Keep existing ticket/assignee subscriptions if already wired on these pages. On change, **debounce** a refetch of the current page + counts. Do not reload the entire ticket table into memory.

## Edge cases

- No assignments → empty list and zero counts.
- Filters shrink results past the current page → clamp to page 1.
- Last item on a page updated away / filtered out → refetch; if empty and `page > 1`, go to `page - 1`.
- Approver-specific tabs (e.g. Approval Pending) keep current bucket definitions; only the data source and pagination change.

## Verification

- Super Admin on Resolver/Approver: far fewer DOM nodes; at most ~50 cards mounted per page.
- Tab badges change when Filters change; list length ≤ 50.
- Assignee scoping still correct for real resolver/approver users (re-check when credentials available).
- Modal status/comment still works; list + counts refresh after close.
- Network: no multi-thousand-row ticket dump on page enter.

## Out of scope

- Admin All Tickets mobile filter collapse (B)
- Unifying admin vs resolver/approver ticket detail modals (B)
- Track deep-link and Ticket Admin verification (C)
- New sort controls on Resolver/Approver
- DB migrations
- Rewriting IssueContext for all consumers
