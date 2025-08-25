# User Dependency Status Feature Guide

## Overview
The User Dependency status is a new ticket status that allows resolvers and admins to pause ticket resolution when waiting for user input or response. Tickets in this status will automatically be resolved after 7 days with an auto-generated comment.

## New Status Flow
```
OPEN → IN_PROGRESS → SEND_FOR_APPROVAL → APPROVED → RESOLVED
  ↓         ↓              ↓
USER_DEPENDENCY ←→ IN_PROGRESS (for user input waiting)
```

## Status Transitions

### Resolver Role
- **From `open`:** → `in_progress`, `user_dependency` (requires comment)
- **From `in_progress`:** → `send_for_approval`, `ops_input_required`, `user_dependency` (requires comment)
- **From `ops_input_required`:** → `in_progress`, `user_dependency` (requires comment)
- **From `user_dependency`:** → `in_progress`, `send_for_approval` (requires comment)

### Super Admin Role
- Can transition to/from any status including `user_dependency`
- Full control over ticket workflow

## Auto-Resolution Logic
- **Trigger:** Tickets remain in `user_dependency` status for 7 days
- **Action:** Automatically moved to `resolved` status
- **Comment:** "Auto-closed due to no response from the user"
- **Timeline:** Event logged with reason "auto_resolved"

## Database Changes
1. **New enum value:** `user_dependency` added to `ticket_status_new`
2. **New column:** `user_dependency_started_at` in tickets table
3. **New function:** `auto_resolve_user_dependency_tickets()`
4. **New trigger:** Automatically sets `user_dependency_started_at` when status changes
5. **Updated transitions:** All status transition rules updated

## Setup Instructions

### 1. Run Database Migrations (IMPORTANT: Run in order!)
Due to PostgreSQL enum constraints, you must run these migrations in sequence:

**Step 1: Add the enum value**
```sql
-- Run this migration first:
-- supabase/migrations/20250703000000_add_user_dependency_enum.sql
```

**Step 2: Add the implementation**
```sql
-- After Step 1 is committed, run this migration:
-- supabase/migrations/20250703000001_add_user_dependency_implementation.sql
```

**⚠️ Important:** The first migration must be committed before running the second one, as PostgreSQL requires new enum values to be committed before they can be used in the same transaction.

### 2. Environment Variables
Add to your Netlify environment variables:
```
AUTO_RESOLVE_SECRET=your_secure_random_token_here
```

### 3. Scheduled Job Setup
Set up a daily cron job to call the auto-resolve endpoint:

**Option A: External Cron Service (e.g., cron-job.org)**
```
POST https://your-site.netlify.app/.netlify/functions/auto-resolve-user-dependency
Headers: Authorization: Bearer your_secure_random_token_here
```

**Option B: Netlify Cron Function (if available)**
Add to your `netlify.toml`:
```toml
[functions."auto-resolve-user-dependency"]
  schedule = "0 2 * * *"  # Daily at 2 AM UTC
```

## Usage Examples

### Moving Ticket to User Dependency
```typescript
// Resolver or Admin can move ticket to user dependency
await TicketService.updateTicketStatus(
  ticketId,
  'user_dependency',
  userId,
  'Waiting for user to provide additional information',
  userRole
);
```

### Checking Auto-Resolution Status
```typescript
import { AutoResolutionService } from '../services/autoResolutionService';

// Get tickets that will auto-resolve soon
const autoResolvingSoon = await AutoResolutionService.getTicketsAutoResolvingSoon();

// Get all user dependency tickets with timing info
const userDependencyTickets = await AutoResolutionService.getUserDependencyTickets();
```

## Monitoring and Maintenance

### Daily Checks
- Monitor auto-resolution logs
- Check for any failed auto-resolutions
- Review tickets that were auto-resolved

### Manual Override
Super Admins can manually resolve tickets from `user_dependency` status if needed before the 7-day period.

### Performance Considerations
- Index created on `(status, user_dependency_started_at)` for efficient queries
- Function processes tickets in batches to avoid long-running transactions

## Troubleshooting

### Common Issues
1. **Migration fails:** Ensure Supabase is running and accessible
2. **Auto-resolution not working:** Check function permissions and environment variables
3. **Status transitions blocked:** Verify role permissions in status_transitions table

### Debug Commands
```sql
-- Check tickets in user dependency status
SELECT * FROM tickets WHERE status = 'user_dependency';

-- Check auto-resolution function
SELECT * FROM auto_resolve_user_dependency_tickets();

-- Verify trigger is working
SELECT * FROM information_schema.triggers 
WHERE trigger_name = 'trigger_set_user_dependency_started_at';
```

## Security Considerations
- Auto-resolve function requires authentication token
- Only system can auto-resolve tickets (no user impersonation)
- All auto-resolutions are logged in timeline for audit purposes

## Future Enhancements
- Configurable auto-resolution time (currently hardcoded to 7 days)
- Email notifications before auto-resolution
- User dependency reason categorization
- Escalation paths for critical tickets
