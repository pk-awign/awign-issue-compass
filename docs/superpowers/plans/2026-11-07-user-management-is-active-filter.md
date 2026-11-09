# User Management Is Active Filter Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an Is Active select filter (All / Active / Inactive, default All) to the Users tab in User Management, client-side alongside search and role.

**Architecture:** Extend `UserManagementPanel` local filter state and `filteredUsers` memo. No service or schema changes; users remain fully loaded client-side.

**Tech Stack:** React, existing shadcn `Select` / `Button` in `UserManagementPanel.tsx`.

## Global Constraints

- Default active filter is `'all'` (show everyone until narrowed)
- Client-side filter only on existing `users` array
- Clear resets search, role, and active filter
- Subtitle “N accounts · M active” stays based on full `users`, not filtered subset
- No API / AdminService / DB changes
- Local-first: do not commit unless the user asks

---

## File map

| File | Responsibility |
|------|----------------|
| `src/components/admin/UserManagementPanel.tsx` | State, filter logic, Select UI, Clear button |
| `docs/superpowers/specs/2026-11-07-user-management-is-active-filter-design.md` | Spec (already written; no code changes) |

### Task 1: Add activeFilter state and filter logic

**Files:**
- Modify: `src/components/admin/UserManagementPanel.tsx`

**Interfaces:**
- Produces: `type UserActiveFilter = 'all' | 'active' | 'inactive'`
- Produces: `activeFilter` state default `'all'`

- [x] **Step 1: Add type and state next to `roleFilter`**

Near existing `UserRoleFilter` / `roleFilter`:

```tsx
type UserActiveFilter = 'all' | 'active' | 'inactive';

const [activeFilter, setActiveFilter] = useState<UserActiveFilter>('all');
```

- [x] **Step 2: Apply active filter inside `filteredUsers`**

After the role check, before search:

```tsx
if (activeFilter === 'active' && !user.isActive) return false;
if (activeFilter === 'inactive' && user.isActive) return false;
```

Include `activeFilter` in the `useMemo` dependency array.

- [x] **Step 3: Manual check**

Mentally verify: default All shows active + inactive; Active hides inactive; Inactive hides active; combines with role + search.

### Task 2: Wire Select UI and Clear

**Files:**
- Modify: `src/components/admin/UserManagementPanel.tsx` (filter row ~353–390)

**Interfaces:**
- Consumes: `activeFilter` / `setActiveFilter` from Task 1

- [x] **Step 1: Add Select after Role**

```tsx
<Select
  value={activeFilter}
  onValueChange={value => setActiveFilter(value as UserActiveFilter)}
>
  <SelectTrigger className="w-full sm:w-40" aria-label="Filter by active status">
    <SelectValue />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="all">All statuses</SelectItem>
    <SelectItem value="active">Active</SelectItem>
    <SelectItem value="inactive">Inactive</SelectItem>
  </SelectContent>
</Select>
```

- [x] **Step 2: Update Clear visibility and reset**

Show Clear when `searchTerm || roleFilter !== 'all' || activeFilter !== 'all'`.

On Clear:

```tsx
setSearchTerm('');
setRoleFilter('all');
setActiveFilter('all');
```

- [x] **Step 3: Verify in UI**

Open User Management → Users tab. Confirm All/Active/Inactive filter the table, combine with role/search, and Clear resets all three.

- [ ] **Step 4: Commit only if user asks**

Do not commit in this plan unless explicitly requested.
