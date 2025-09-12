# Changelog (Pending Review)

Date: 2025-09-11

This document summarizes the frontend and flow updates completed in this session. Nothing has been committed yet; this file is for review.</n+
## Status & Flow
- Added new status: `ops_user_dependency` (OPS + USER DEPENDENCY).
- Frontend label mapping:
  - `in_progress` → PENDING ON CX
  - `resolved` → CLOSED
  - `ops_input_required` → OPS DEPENDENCY
  - `ops_user_dependency` → OPS + USER DEPENDENCY
- Updated allowed transitions (frontend enforcement):
  - Resolver:
    - OPEN → PENDING ON CX (auto on resolver assignment)
    - PENDING ON CX → SEND FOR APPROVAL, USER DEPENDENCY, OPS DEPENDENCY, OPS + USER DEPENDENCY
    - USER DEPENDENCY → PENDING ON CX, OPS DEPENDENCY, OPS + USER DEPENDENCY, SEND FOR APPROVAL
    - OPS DEPENDENCY → PENDING ON CX
    - OPS + USER DEPENDENCY → PENDING ON CX
    - APPROVED → CLOSED
  - Approver:
    - SEND FOR APPROVAL → APPROVED or PENDING ON CX
  - Super Admin: can move between all statuses (includes OPS + USER DEPENDENCY).
- Auto-move logic: assigning a Resolver automatically moves the ticket to `in_progress` (PENDING ON CX).

## UI/UX Updates
- Approver Dashboard header and info banner simplified (neutral tones, compact pending count).
- `TicketStatsCards` titles and colors refined; Approver “Pending” now counts `in_progress`, `ops_input_required`, `ops_user_dependency`, and `user_dependency`.
- NotificationBell popover: widened, increased spacing, neutral unread highlight, compact bell counter pill, rounded outline action button.

## Filters
- `TicketFilters` reorganized into two rows across Approver and Resolver:
  - Row 1: Search, Resource ID, Date Range
  - Row 2: Status, Severity, Category, City
- Status dropdown labels updated globally to the new naming; added OPS + USER DEPENDENCY.
- Super Admin filter in `AdminPage` updated to the new labels and added OPS + USER DEPENDENCY.

## Resolver Dashboard
- Tabs updated: All, Pending on CX, User Dependency, Ops Dependency, Approved, Closed.
- “Close the ticket” action added on cards only in the Approved tab (calls status update to CLOSED) and positioned under the View action.

## Approver Dashboard
- Quick actions retained for SEND FOR APPROVAL:
  - Approve → APPROVED
  - Send back to CX → PENDING ON CX
- Resolve action removed from Approver (closing happens by Resolver or auto-close).

## Data/Compatibility Fixes
- Normalized `assignees` usage (supports both array and object shapes) in:
  - `ResolutionApproverPage.tsx`
  - `TicketResolverPage.tsx`
  - `AdminPage.tsx`
  - `notificationService.ts`
- Timeline/status display now uses the centralized label mapper.

## Dev & Infra
- Dev server runs on port 8008 via Vite config.
- Plan for auto-close (Supabase cron):
  - Function: mark APPROVED tickets as CLOSED after 48 hours.
  - Example SQL function and hourly schedule prepared (not yet created/scheduled in DB).

## Files Touched (key)
- `src/pages/ResolutionApproverPage.tsx` (labels, UI, quick actions scope)
- `src/pages/TicketResolverPage.tsx` (tabs, close action, labels)
- `src/components/TicketFilters.tsx` (layout and labels)
- `src/components/TicketStatsCards.tsx` (cards, counts, colors)
- `src/components/NotificationBell.tsx` (popover spacing and badges)
- `src/utils/status.ts` (label mapping)
- `src/utils/timelineUtils.ts` (status formatter)
- `src/services/ticketService.ts` (transitions, auto-move on assign)
- `src/pages/AdminPage.tsx` (status filter labels)

## Open Decisions / Next Steps
- Create and schedule Supabase auto-close function (Option A) once approved.
- Confirm if Approver’s “Approve / Send back to CX” should be visible outside SEND FOR APPROVAL context.
- Confirm if “Close the ticket” should also be available in the ticket modal for convenience.


