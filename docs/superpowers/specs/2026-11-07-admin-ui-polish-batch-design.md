# Admin UI Polish Batch (1, 3, 4, 5, 6) — Design

## Summary

Five admin polish items: persist tab URLs, fix Overview System Health metrics, gate Integrations (WhatsApp) to one mobile, add Activity Log filters, improve tickets table description/assignees/category.

## 1. Tab URLs

- `handleTabChange` always navigates to `/admin?tab=<value>`
- Valid tabs: `overview` | `tickets` | `analytics` | `users` | `activity` | `integrations`
- Legacy `whatsapp` / `settings` map to `integrations`
- If URL is Integrations but viewer is not the allowlisted mobile → force `overview`

## 3. Overview System Health

Drive from `analytics` (same payload as overview cards):

| Label | Source |
|-------|--------|
| SLA Compliance | `(totalTickets - slaBreachedTickets) / totalTickets` (0 → show `—` or 100% when total is 0, match Analytics) |
| Avg Resolution | `avgResolutionHours` |
| Active resolvers | `resolverBreakdown.length` (relabel from Active Users) |

Remove paginated-ticket helpers `calculateSLACompliance` / `calculateAvgResolutionTime` / `calculateActiveUsers`.

## 4. Integrations tab

- Rename Settings → **Integrations**
- Visible only when normalized `user.mobile` === `9897700777` (strip spaces, leading `+91` / `91`)
- Card wrapper + short ops/test tooling description + `WhatsAppTestComponent`
- Quick Action and tab trigger hidden for everyone else
- Unauthorized deep link → overview

## 5. Activity Log filters

Client-side on loaded list (≤500):

- Search: ticket #, actor, description text
- Action type: All + distinct types in the list
- Date: All | Today | Last 7 days
- Clear resets all three

## 6. Tickets table

- Description: `max-w-xs line-clamp-3` (desktop matches mobile)
- Category: `formatOverviewCategory`
- Columns Resolver / Approver from assignees + resolvers/approvers name maps; `—` if empty

## Out of scope

Export toolbar, download modal polish, server-side activity pagination, delete AlertDialog.
