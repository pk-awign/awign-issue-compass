# User Management Is Active Filter — Design

## Summary

Add an **Is Active** filter to the Users tab in `UserManagementPanel`, beside the existing search and role filters, so admins can narrow the table to Active, Inactive, or All users.

## Decisions

| Topic | Choice |
|-------|--------|
| Control | Second `Select` next to Role |
| Options | All statuses · Active · Inactive |
| Default | All (`'all'`) |
| Filtering | Client-side on the already-loaded `users` list |
| Clear | Resets search, role, and active filter |

## UI

In the users tab filter row (`UserManagementPanel`):

- Keep search + role Select as today
- Add **Is Active** Select: All statuses | Active | Inactive
- Show Clear when any of search / role / active filter is non-default
- Clear sets `searchTerm` → `''`, `roleFilter` → `'all'`, `activeFilter` → `'all'`

## Filtering

Extend `filteredUsers`:

1. Role filter (existing)
2. Active filter: if `'active'` keep `user.isActive === true`; if `'inactive'` keep `user.isActive === false`; if `'all'` no-op
3. Search term (existing)

Header count continues to use `filteredUsers.length`. The subtitle “N accounts · M active” stays based on the full `users` list (not the filtered subset).

## State

- `activeFilter: 'all' | 'active' | 'inactive'`
- Default: `'all'`

No API, schema, or `AdminService` changes.

## Out of scope

- Server-side / paginated user queries
- Permissions tab
- Changing activate/deactivate toggle behavior
- Defaulting the list to Active-only
