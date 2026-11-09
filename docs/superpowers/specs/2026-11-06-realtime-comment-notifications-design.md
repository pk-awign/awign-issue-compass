# Realtime invigilator comment notifications

## Goal

Restore the notification bell without reintroducing the full ticket dump.

## Approach

- While a staff user is logged in, subscribe to `comments` INSERT via Supabase realtime.
- On insert: if author looks like invigilator/anonymous, and the ticket is assigned to that user → push into existing in-memory `NotificationService`.
- On login/start: one scoped seed query (recent invigilator comments on the user’s assigned tickets) so the bell isn’t empty until the next comment.
- Stop subscription on logout.

## Out of scope

- Durable `notifications` table / cross-device read state (later).
