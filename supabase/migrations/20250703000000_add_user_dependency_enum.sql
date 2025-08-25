-- Migration 1: Add User Dependency Status Enum
-- This migration adds the new 'user_dependency' status to the enum
-- Must be run separately and committed before the second migration

-- Add the new enum value
ALTER TYPE ticket_status_new ADD VALUE 'user_dependency';
