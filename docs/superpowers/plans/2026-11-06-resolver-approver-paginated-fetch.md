# Resolver / Approver Paginated Fetch Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Resolver and Approver pages load role-scoped, filter-aware ticket pages of 50 with accurate status-tab counts — never a full-table dump into the DOM.

**Architecture:** Page-local fetch via new `TicketService.getRoleTicketPage` / `getRoleTicketStatusCounts`. Pages stop using `IssueContext.issues` as the list source. Super Admin keeps access with no assignee filter. Tab badges use the same Filters as the list (not the active status tab).

**Tech Stack:** React, Supabase JS client, existing `TicketService` / `ticket_assignees`, shadcn Button/Tabs.

**Spec:** `docs/superpowers/specs/2026-11-06-resolver-approver-paginated-fetch-design.md`

## Global Constraints

- Page size **50** (match Admin)
- Default sort **`submitted_at` descending** (spec; replaces current client sort by last comment)
- Tab counts **respect Filters**; list = Filters + active status tab + page
- Do **not** call `refreshIssues()` as the primary list loader on these two pages
- No DB migrations
- Out of scope: Admin filter collapse / modal unify (B), Track deep-link / Ticket Admin (C)

## File map

| File | Responsibility |
|------|----------------|
| `src/services/roleTicketQuery.ts` | Types + pure helpers: status-tab → DB status, filter application notes, empty count maps, page range math |
| `src/services/ticketService.ts` | `getRoleTicketPage`, `getRoleTicketStatusCounts` (Supabase queries) |
| `src/components/TicketStatsCards.tsx` | Accept optional `statusCounts` / summary so pages need not pass full arrays |
| `src/pages/TicketResolverPage.tsx` | Own list state, pagination UI, wire service, drop IssueContext list dependency |
| `src/pages/ResolutionApproverPage.tsx` | Same for approver tabs/buckets |

---

### Task 1: Types + pure helpers

**Files:**
- Create: `src/services/roleTicketQuery.ts`
- Test: manual via Node one-liner / `npx tsc --noEmit` (repo has no vitest)

**Interfaces:**
- Produces:
  - `RoleTicketRole = 'resolver' | 'approver' | 'super_admin'`
  - `RoleTicketListFilters` (search, severity, category, city, resourceIds, dateFrom/dateTo, plus optional advanced fields)
  - `ResolverStatusTab` / `ApproverStatusTab` unions matching existing tab values
  - `ResolverStatusCountMap` / `ApproverStatusCountMap`
  - `pageRange(page, limit) => { from, to }`
  - `emptyResolverCounts()` / `emptyApproverCounts()`
  - `statusTabToDbStatus(tab)` → `Issue['status'] | 'all'`

- [ ] **Step 1: Create `src/services/roleTicketQuery.ts`**

```typescript
import type { DateRange } from 'react-day-picker';
import type { Issue } from '@/types/issue';

export type RoleTicketRole = 'resolver' | 'approver' | 'super_admin';

export type ResolverStatusTab =
  | 'all'
  | 'in_progress'
  | 'user_dependency'
  | 'ops_input_required'
  | 'ops_user_dependency'
  | 'send_for_approval'
  | 'approved'
  | 'resolved';

export type ApproverStatusTab =
  | 'all'
  | 'approval_pending'
  | 'approved'
  | 'resolved';

export interface RoleTicketListFilters {
  searchQuery?: string;
  severityFilter?: string; // 'all' or sev1|sev2|sev3
  categoryFilter?: string;
  cityFilter?: string;
  resourceIdFilter?: string[];
  dateRange?: DateRange;
  /** Optional: ticket IDs pre-resolved for last-status / last-comment / recently-sent */
  constrainToTicketIds?: string[] | null;
}

export type ResolverStatusCountMap = Record<ResolverStatusTab, number>;
export type ApproverStatusCountMap = {
  all: number;
  approval_pending: number;
  approved: number;
  resolved: number;
};

export function pageRange(page: number, limit: number): { from: number; to: number } {
  const safePage = Math.max(1, page);
  const from = (safePage - 1) * limit;
  return { from, to: from + limit - 1 };
}

export function emptyResolverCounts(): ResolverStatusCountMap {
  return {
    all: 0,
    in_progress: 0,
    user_dependency: 0,
    ops_input_required: 0,
    ops_user_dependency: 0,
    send_for_approval: 0,
    approved: 0,
    resolved: 0,
  };
}

export function emptyApproverCounts(): ApproverStatusCountMap {
  return { all: 0, approval_pending: 0, approved: 0, resolved: 0 };
}

export function resolverTabToStatus(tab: ResolverStatusTab): Issue['status'] | 'all' {
  if (tab === 'all') return 'all';
  return tab;
}

export function approverTabToStatus(tab: ApproverStatusTab): Issue['status'] | 'all' {
  if (tab === 'all') return 'all';
  if (tab === 'approval_pending') return 'send_for_approval';
  return tab;
}

export function clampPage(page: number, total: number, limit: number): number {
  if (total <= 0) return 1;
  const maxPage = Math.max(1, Math.ceil(total / limit));
  return Math.min(Math.max(1, page), maxPage);
}
```

- [ ] **Step 2: Typecheck helpers**

Run: `npx tsc --noEmit`
Expected: exit 0 (or only pre-existing errors unrelated to this file)

- [ ] **Step 3: Commit**

```bash
git add src/services/roleTicketQuery.ts
git commit -m "Add role ticket query types and pagination helpers."
```

---

### Task 2: TicketService page + counts

**Files:**
- Modify: `src/services/ticketService.ts` (append methods; import helpers from `roleTicketQuery.ts`)
- Consumes: `RoleTicketRole`, `RoleTicketListFilters`, `pageRange`, count empties, tab→status mappers
- Produces:
  - `TicketService.getRoleTicketPage(params): Promise<{ tickets: Issue[]; total: number }>`
  - `TicketService.getRoleTicketStatusCounts(params): Promise<ResolverStatusCountMap | ApproverStatusCountMap>`

**Query strategy (mirror Admin assignee filtering):**

1. If `role` is `resolver` or `approver`: load `ticket_id`s from `ticket_assignees` where `user_id` + `role` match. If none → return empty.
2. If `constrainToTicketIds` is provided (advanced filters): intersect with that set; empty intersection → empty.
3. Build `tickets` query: `deleted = false`, optional `.in('id', ticketIds)`, apply filters:
   - search: same `.or(...)` pattern as Admin (`ticket_number`, `issue_description`, `city`, `centre_code`)
   - severity / category / city / resource_id / date on `submitted_at` (use `submitted_at` to match list mental model; document if Admin uses `created_at` — prefer **`submitted_at`** for these pages)
   - status tab: `.eq('status', ...)` when not `all`
4. Count query: same filters **without** status tab for `getRoleTicketStatusCounts`; for page `total`, **with** status tab.
5. Order `submitted_at` desc; `.range(from, to)`.
6. Hydrate each row with `TicketService.getTicketByNumber(ticket_number)` (same as `AdminService.getAllTickets`) so modal/comments keep working.

**Counts method:** After applying scope + filters (no status tab), either:
- fetch matching `id, status` in batches of 1000 and aggregate in JS, or
- run one `count` per status key in parallel  

Prefer **parallel head counts per status** + one `all` count (same filters) for accuracy without pulling rows. For Super Admin with huge tables this is ~8 count queries — acceptable vs full dump.

**Advanced filters (last status / last comment / recently sent):**
- Page code resolves ID sets using existing helpers (`getLastStatusForTickets` is too heavy on all IDs — instead):
  - **Recently sent:** already have `getTicketsSentForApprovalInRange` → pass as `constrainToTicketIds`
  - **Last status / last comment:** v1 options in implementation order:
    1. If filter inactive → no constrain
    2. If active → fetch assignee-scoped ticket id list (ids only, batched), then apply existing last-status/comment logic client-side on that id set to produce `constrainToTicketIds`, then run page/counts  
    Document this in code comments. Do **not** fall back to IssueContext full dump.

- [ ] **Step 1: Implement `getRoleTicketPage` and `getRoleTicketStatusCounts` on `TicketService`**

Sketch of signatures:

```typescript
static async getRoleTicketPage(params: {
  role: RoleTicketRole;
  userId: string;
  statusTab: ResolverStatusTab | ApproverStatusTab;
  filters: RoleTicketListFilters;
  page?: number;
  limit?: number;
}): Promise<{ tickets: Issue[]; total: number }>

static async getRoleTicketStatusCounts(params: {
  role: RoleTicketRole;
  userId: string;
  panel: 'resolver' | 'approver';
  filters: RoleTicketListFilters;
}): Promise<ResolverStatusCountMap | ApproverStatusCountMap>
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: exit 0 for new code

- [ ] **Step 3: Commit**

```bash
git add src/services/ticketService.ts
git commit -m "Add role-scoped paginated ticket page and status count queries."
```

---

### Task 3: TicketStatsCards summary prop

**Files:**
- Modify: `src/components/TicketStatsCards.tsx`

**Interfaces:**
- Consumes: optional `summary?: { total: number; open: number; pendingOrInProgress: number; resolved: number }`
- When `summary` provided, use it for the four primary cards; set sev breakdown / last24h / avg to `0` / `N/A` (spec v1)
- When omitted, keep current `tickets[]` behavior for any other callers

- [ ] **Step 1: Extend props and branch rendering**

```typescript
interface TicketStatsCardsProps {
  tickets?: Issue[];
  userRole: 'resolver' | 'approver';
  summary?: {
    total: number;
    open: number;
    pendingOrInProgress: number;
    resolved: number;
  };
}
```

Map resolver `pendingOrInProgress` → PENDING ON CX card; approver → PENDING card. Hide or show N/A for avg resolution / last 24h / severity when `summary` is set.

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`

- [ ] **Step 3: Commit**

```bash
git add src/components/TicketStatsCards.tsx
git commit -m "Allow TicketStatsCards to render from status summary counts."
```

---

### Task 4: Wire TicketResolverPage

**Files:**
- Modify: `src/pages/TicketResolverPage.tsx`

**Behavior:**
- Remove list dependency on `issues` from `useIssues` (keep `updateStatus` / modal helpers if needed via context or TicketService).
- State: `tickets`, `page`, `total`, `statusCounts`, `listLoading`, `listError`
- `loadList` async: build `RoleTicketListFilters` from existing filter state; resolve advanced `constrainToTicketIds` when needed; call page + counts in parallel; `setPage(clampPage(...))`
- `useEffect` deps: user id/role, activeTab, filters, page
- On filter/tab change: `setPage(1)` then load (or load with page forced to 1)
- Render `statusCounts[tab]` on badges; render `tickets` for active tab only (server already filtered by tab — **do not** re-split client-side into 8 arrays of full data)
- Pagination controls under list
- `onTicketUpdate`: call `loadList()` again
- Filter dropdown options (cities/categories): derive from **current page** is weak — for v1 keep static known enums where possible, or fetch distinct values later. Prefer: cities/categories/severities from a lightweight distinct query **or** keep the MultiSelect options from a one-time `getRoleTicketFilterOptions` if easy; otherwise hardcode severity and load distinct city/category via `select` with limit. Minimum viable: keep severity hardcoded; for city/category use values present on **loaded page + previously selected** so UX does not break.
- Remove verbose `RESOLVER DEBUG` console logs while touching this file
- Stats: pass `summary` derived from `statusCounts` (`open` may be 0 on resolver tabs — use counts: total=`all`, inProgress=`in_progress`, resolved=`resolved`, open=`0` or omit)

- [ ] **Step 1: Replace data loading + add pagination UI**
- [ ] **Step 2: Verify in browser as Super Admin**

Run: `npm run dev` → open `/ticket-resolver`
Expected:
- Status tab badges are non-zero without mounting thousands of nodes
- At most ~50 View buttons
- Changing Filters updates badges
- Prev/Next works
- Opening a ticket modal still works; after status change list refreshes

- [ ] **Step 3: Commit**

```bash
git add src/pages/TicketResolverPage.tsx
git commit -m "Paginate resolver ticket list with role-scoped fetches."
```

---

### Task 5: Wire ResolutionApproverPage

**Files:**
- Modify: `src/pages/ResolutionApproverPage.tsx`

Same pattern as Task 4 with Approver tabs:
- `all` → no status filter
- `approval_pending` → `send_for_approval`
- `approved` / `resolved` as today
- Recently-sent filter → `constrainToTicketIds` via existing range helper
- Remove `APPROVER DEBUG` logs
- Pagination + summary stats

- [ ] **Step 1: Replace data loading + pagination**
- [ ] **Step 2: Browser check `/resolution-approver`** (same expectations as resolver)
- [ ] **Step 3: Commit**

```bash
git add src/pages/ResolutionApproverPage.tsx
git commit -m "Paginate approver ticket list with role-scoped fetches."
```

---

### Task 6: Final verification

- [ ] **Step 1: Production build**

Run: `npm run build`
Expected: exit 0

- [ ] **Step 2: Performance smoke (browser console)**

On `/ticket-resolver` as Super Admin after load:

```javascript
document.querySelectorAll('button').length
```

Expected: on the order of tens–low hundreds, **not** ~4000+ View buttons.

- [ ] **Step 3: Regression checklist**

| Check | Expected |
|-------|----------|
| Resolver tab badges move with Filters | Yes |
| Approver Approval Pending count vs list | Consistent |
| Page size | ≤ 50 cards |
| Modal comment/status | Works; list refreshes |
| `IssueContext` full dump | Not triggered by entering these pages |

- [ ] **Step 4: Commit any verification fixes** (only if needed)

---

## Spec coverage

| Spec item | Task |
|-----------|------|
| Page-local fetch / no IssueContext list | 4, 5 |
| getRoleTicketPage / counts | 2 |
| S1 Super Admin paginated access | 2, 4, 5 |
| C1 filter-aware tab counts | 2, 4, 5 |
| Page size 50 + Prev/Next | 4, 5 |
| submitted_at desc | 2 |
| Stats from counts | 3, 4, 5 |
| Refresh after modal | 4, 5 |
| Debounce realtime optional | 4/5 if subscriptions already present; else skip |
| Out of scope B/C | Not in plan |

## Placeholder / consistency self-check

- Method names: `getRoleTicketPage`, `getRoleTicketStatusCounts` used consistently
- Tab unions match existing Resolver/Approver UI values
- No TBD left for core path; advanced filter ID pre-resolve documented as required implementation detail in Task 2
