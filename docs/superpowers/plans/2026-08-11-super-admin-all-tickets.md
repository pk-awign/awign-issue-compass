# Super Admin All Tickets Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Standalone `/super-admin` login → `/super-admin/all-tickets` dashboard with previous-month default, exclude open/in_progress, 50-row pagination; keep Admin Ticket Center link.

**Architecture:** Reuse existing PIN auth; gate by `super_admin`. Client-side filter/pagination on Combined Tickets page. Redirect old combined-tickets path.

**Tech stack:** React, React Router, date-fns, existing AuthContext + CombinedTicketsService.

## File map

| File | Responsibility |
|------|----------------|
| `src/pages/SuperAdminLoginPage.tsx` | Super-admin-only login UI |
| `src/App.tsx` | Routes `/super-admin`, `/super-admin/all-tickets`, redirect old path |
| `src/pages/CombinedTicketsDashboardPage.tsx` | Date default, status exclusion, pagination, auth redirects |
| `src/pages/AdminPage.tsx` | Point Ticket Center button at new URL (keep entry) |
| `src/contexts/AuthContext.tsx` | Optional: return user from loginWithPin for role check |

### Task 1: Routes + Super Admin login page

- Create `SuperAdminLoginPage` (mobile/email PIN, no signup). After login, only allow `super_admin`; else toast and do not keep session.
- Routes: `/super-admin`, `/super-admin/all-tickets`, redirect `/admin/combined-tickets` → `/super-admin/all-tickets`.

### Task 2: Dashboard behavior

- Default date = previous calendar month; clear restores it.
- Exclude `open` and `in_progress` from filtered set; remove Open / Pending on CX cards.
- Auth redirects: unauthenticated → `/super-admin`; non–super_admin → `/`; logout → `/super-admin`.
- All Tickets pagination: 50/page, Prev/Next, reset on filter change.

### Task 3: Admin link

- Keep Ticket Center button; navigate to `/super-admin/all-tickets`.

### Task 4: Verify locally

- Hit `/super-admin`, login as super_admin → all-tickets.
- Confirm default month, excluded statuses, pagination, Admin button still present.
