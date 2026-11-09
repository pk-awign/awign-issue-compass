# Admin UI Polish Batch Implementation Plan

> **For agentic workers:** Tasks tracked inline; executed in-session.

**Goal:** Ship admin polish items 1, 3, 4, 5, 6 from the design spec.

**Architecture:** Client-only UI/wiring changes in `AdminPage` and `ActivityLog`; no schema migrations.

**Tech Stack:** React, react-router search params, existing analytics + shadcn controls.

## Global Constraints

- Integrations tab only for normalized mobile `9897700777`
- System Health from `analytics` payload
- Activity filters client-side on loaded list
- Local-first: commit only on user request

## Tasks

### Task 1: Tab URLs + Integrations gate + System Health + tickets table
- Modify: `src/pages/AdminPage.tsx`
- [x] Persist `?tab=` for all tabs; map legacy settings/whatsapp → integrations
- [x] Gate Integrations tab / quick action / content to allowlisted mobile
- [x] System Health from analytics; label Active resolvers
- [x] Table: line-clamp-3 description, formatOverviewCategory, Resolver/Approver columns

### Task 2: Activity Log filters
- Modify: `src/components/admin/ActivityLog.tsx`
- [x] Search + action type + date (All/Today/Last 7 days) + Clear

### Task 3: Docs
- [x] Spec: `docs/superpowers/specs/2026-11-07-admin-ui-polish-batch-design.md`
- [x] This plan
