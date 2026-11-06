# Final whole-branch review fixes (feat/resolver-approver-paginated-fetch)

## Important 1 — service errors propagate
- `TicketService.getRoleTicketPage` / `getRoleTicketStatusCounts` now log and rethrow instead of returning empty results.
- `TicketResolverPage` / `ResolutionApproverPage` `loadList` catch: generic failures toast.error with the error message, set `listError`, and keep the prior `tickets` / `total` / `statusCounts`.
- `TooManyAdvancedMatchesError` unchanged: empty list + specific message.
- Render: the full error card shows only when there is no list to keep; otherwise an inline banner with Retry sits above the retained list.

## Important 2 — notification click off-page
- Added `TicketService.getTicketById` (id -> ticket_number -> `getTicketByNumber`).
- `TicketResolverPage.handleTicketClick` falls back to it when the ticket is not on the current page; toasts if not found / fetch fails. Approver page has no notification handler (Header only wires the bell for resolvers), so nothing to change there.

## Not fixed (by request)
- Important 3 (500 cap vs ordinary filters) — left for product decision.

## Verification
- `npx tsc -p tsconfig.app.json --noEmit`: 4 pre-existing errors (CombinedTicketsCsvUploadDialog, IssueContext), none in touched files; count identical before/after.
- Browser check not run.
- Unrelated working-tree edits to ResolutionApproverPage (BrandLogo header) were left unstaged.
