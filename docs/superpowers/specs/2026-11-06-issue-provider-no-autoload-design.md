# IssueProvider: no auto-load full dump

## Goal

Stop loading every ticket (+ comments/attachments/assignees) into React on app mount and on every realtime event / mutation.

## Decisions

| Topic | Choice |
|-------|--------|
| Auto-load on mount | **Off** — `issues` starts empty |
| Realtime full refetch | **Off** — do not call `refreshIssues` on ticket/assignee changes |
| After mutations (`addIssue`, `updateIssue`, `addComment`, `updateStatus`) | **Do not** full-refetch; callers that need lists already refetch page-local |
| `refreshIssues` API | Kept for rare explicit callers (e.g. legacy `AdminDashboard`) |
| Track / Workforce / TicketTracker | Unchanged — they already use scoped service helpers |

## Out of scope

- Server-side admin analytics aggregates (#2)
- Admin All Tickets server pagination (#3)
- Dedicated notification feed (today notifications are fed by full dump; may go quiet until a follow-up)

## Success

- Opening `/`, `/track`, `/login`, resolver/approver/admin no longer triggers multi-thousand-row ticket dumps from `IssueProvider`.
- Submit ticket / track / resolver list still work.
