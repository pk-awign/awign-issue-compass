-- Update Status Transitions Migration
-- This migration updates both approver and resolver status transitions:
-- Approver: From send_for_approval: → approved, in_progress (instead of ops_input_required)
-- Resolver: All movements now require comments, updated transitions

-- Clear existing status transitions
DELETE FROM public.status_transitions;

-- Insert updated status transition rules
INSERT INTO public.status_transitions (from_status, to_status, allowed_roles, requires_comment) VALUES
-- Resolver transitions (all movements require comments)
('open', 'in_progress', ARRAY['resolver', 'super_admin'], true),
('in_progress', 'send_for_approval', ARRAY['resolver', 'super_admin'], true),
('in_progress', 'ops_input_required', ARRAY['resolver', 'super_admin'], true),
('in_progress', 'user_dependency', ARRAY['resolver', 'super_admin'], true),
('ops_input_required', 'in_progress', ARRAY['resolver', 'super_admin'], true),
('ops_input_required', 'user_dependency', ARRAY['resolver', 'super_admin'], true),
('user_dependency', 'in_progress', ARRAY['resolver', 'super_admin'], true),

-- Approver transitions (updated: send_for_approval → approved, in_progress)
('send_for_approval', 'approved', ARRAY['approver', 'super_admin'], false),
('send_for_approval', 'in_progress', ARRAY['approver', 'super_admin'], false),
('approved', 'resolved', ARRAY['approver', 'super_admin'], false),

-- Super Admin can transition to any status (including backward for management)
('open', 'send_for_approval', ARRAY['super_admin'], false),
('open', 'approved', ARRAY['super_admin'], false),
('open', 'resolved', ARRAY['super_admin'], false),
('open', 'ops_input_required', ARRAY['super_admin'], false),
('in_progress', 'open', ARRAY['super_admin'], false),
('in_progress', 'approved', ARRAY['super_admin'], false),
('in_progress', 'resolved', ARRAY['super_admin'], false),
('ops_input_required', 'open', ARRAY['super_admin'], false),
('ops_input_required', 'approved', ARRAY['super_admin'], false),
('ops_input_required', 'resolved', ARRAY['super_admin'], false),
('user_dependency', 'open', ARRAY['super_admin'], false),
('user_dependency', 'approved', ARRAY['super_admin'], false),
('user_dependency', 'resolved', ARRAY['super_admin'], false),
('send_for_approval', 'open', ARRAY['super_admin'], false),
('send_for_approval', 'resolved', ARRAY['super_admin'], false),
('send_for_approval', 'ops_input_required', ARRAY['super_admin'], false),
('approved', 'open', ARRAY['super_admin'], false),
('approved', 'in_progress', ARRAY['super_admin'], false),
('approved', 'send_for_approval', ARRAY['super_admin'], false),
('approved', 'ops_input_required', ARRAY['super_admin'], false),

-- Re-open transitions (only for resolved tickets, super admin only)
('resolved', 'open', ARRAY['super_admin'], true);
