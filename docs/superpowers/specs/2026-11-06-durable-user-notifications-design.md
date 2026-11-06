# Durable user notifications

## Goal

Persist in-app notifications in Postgres so the bell survives refresh and does not depend on a full ticket dump or client-only comment watching.

## Decisions

| Topic | Choice |
|-------|--------|
| Recipients | Every current `ticket_assignees` row for the ticket (resolver / approver / ticket_admin) |
| Trigger | After INSERT on `comments` when author is invigilator or anonymous |
| Client | Query/update `user_notifications` by `user_id`; optional realtime on that table |
| Auth model | App uses localStorage users (not `auth.uid()`); filter by app `user.id` |

## Schema

`user_notifications(id, user_id, ticket_id, comment_id, ticket_number, body, created_at, read_at)`  
Unique `(user_id, comment_id)`.

## Out of scope

- Backfill of historical comments (optional later)
- Super-admin “notify on all tickets”
- Push/email channels
