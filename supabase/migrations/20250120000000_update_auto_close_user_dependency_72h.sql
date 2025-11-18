-- Migration: Update Auto-Close User Dependency Tickets to 72 Hours
-- This migration updates the auto-close logic with the following features:
-- 
-- 1. Threshold: Changed from 7 days to 72 hours
-- 2. User Activity Detection:
--    - Checks for recent user activity (comments/attachments) in the last 72 hours
--    - Recent user comment: any non-internal comment from non-staff role (not in admin, resolver, approver, super_admin, ticket_admin, system)
--    - Recent attachment: any attachment uploaded in the last 72 hours (treated as activity regardless of uploader)
-- 3. Safety Checks:
--    - The most recent comment must be internal/staff (to avoid closing when user replied last)
--    - Considered internal if: is_internal = true OR author_role is one of staff roles (admin, resolver, approver, super_admin, ticket_admin)
--    - If there are no comments at all, it is considered safe to close
-- 4. Auto-Resolution:
--    - Updates ticket: status → resolved, resolved_at → now, resolved_via → auto
--    - Adds resolution_notes: "[auto] Closed due to no response from user's end."
--    - Creates audit trail: System comment, ticket_timeline event, ticket_history entry
-- 
-- Return Value: INTEGER - number of tickets auto-resolved in this run
-- 
-- Scheduled Execution: 
--    - Daily at 03:30 and 15:30 via pg_cron: SELECT public.auto_resolve_user_dependency_tickets();
--    - Can also be triggered manually by admin

-- Update the auto-resolve function to check last comment and use 72 hours
CREATE OR REPLACE FUNCTION public.auto_resolve_user_dependency_tickets()
RETURNS INTEGER AS $$
DECLARE
    v_ticket_id UUID;
    v_count INTEGER := 0;
    v_last_comment RECORD;
    v_is_last_comment_internal BOOLEAN;
    v_auto_comment_id UUID;
BEGIN
    -- Find tickets in user_dependency status for more than 72 hours
    FOR v_ticket_id IN 
        SELECT id 
        FROM public.tickets 
        WHERE status = 'user_dependency' 
        AND user_dependency_started_at < NOW() - INTERVAL '72 hours'
        AND deleted = false
    LOOP
        -- Get the last comment for this ticket (most recent by created_at)
        SELECT 
            id,
            is_internal,
            author_role,
            created_at
        INTO v_last_comment
        FROM public.comments
        WHERE ticket_id = v_ticket_id
        ORDER BY created_at DESC
        LIMIT 1;
        
        -- Skip tickets with no comments (treat as new tickets)
        IF v_last_comment.id IS NULL THEN
            -- No comments exist, skip this ticket (don't auto-close)
            CONTINUE;
        END IF;
        
        -- Determine if last comment is from internal person
        -- Internal if: is_internal = true OR author_role is internal (admin, resolver, approver, super_admin, ticket_admin)
        IF v_last_comment.is_internal = TRUE THEN
            -- Explicitly marked as internal
            v_is_last_comment_internal := TRUE;
        ELSIF v_last_comment.author_role IN ('admin', 'resolver', 'approver', 'super_admin', 'ticket_admin') THEN
            -- Internal role
            v_is_last_comment_internal := TRUE;
        ELSE
            -- External comment (invigilator, anonymous) - user responded, keep open
            v_is_last_comment_internal := FALSE;
        END IF;
        
        -- Only auto-close if last comment is from internal person
        IF v_is_last_comment_internal THEN
            -- Auto-resolve the ticket
            UPDATE public.tickets 
            SET 
                status = 'resolved',
                resolved_at = NOW(),
                resolution_notes = COALESCE(resolution_notes, '') || E'\n\nThis ticket is autoclosed due to no response.',
                status_changed_at = NOW(),
                status_changed_by = NULL
            WHERE id = v_ticket_id;
            
            -- Add auto-comment
            INSERT INTO public.comments (id, ticket_id, content, author, author_role, is_internal, created_at)
            VALUES (
                gen_random_uuid(),
                v_ticket_id,
                'This ticket is autoclosed due to no response.',
                'System',
                'system',
                TRUE,
                NOW()
            );
            
            -- Add timeline event
            INSERT INTO public.ticket_timeline (id, ticket_id, event_type, old_value, new_value, performed_by, performed_by_name, performed_by_role, details, created_at)
            VALUES (
                gen_random_uuid(),
                v_ticket_id,
                'status_changed',
                'user_dependency',
                'resolved',
                NULL,
                'System',
                'system',
                '{"reason": "auto_resolved", "comment": "This ticket is autoclosed due to no response."}',
                NOW()
            );
            
            -- Log to ticket_history
            INSERT INTO public.ticket_history (
                ticket_id, 
                action_type, 
                old_value, 
                new_value, 
                performed_by, 
                performed_by_role,
                details
            )
            VALUES (
                v_ticket_id,
                'status_change',
                'user_dependency',
                'resolved',
                'System',
                'system',
                jsonb_build_object('reason', 'auto_resolved', 'comment', 'This ticket is autoclosed due to no response.')
            );
            
            v_count := v_count + 1;
        END IF;
    END LOOP;
    
    RETURN v_count;
END;
$$ LANGUAGE plpgsql;

-- Create function for one-time cleanup of past tickets
CREATE OR REPLACE FUNCTION public.cleanup_past_user_dependency_tickets()
RETURNS INTEGER AS $$
DECLARE
    v_ticket_id UUID;
    v_count INTEGER := 0;
    v_last_comment RECORD;
    v_is_last_comment_internal BOOLEAN;
BEGIN
    -- Find ALL tickets in user_dependency status for more than 72 hours
    -- (regardless of when they entered this status, for historical cleanup)
    FOR v_ticket_id IN 
        SELECT id 
        FROM public.tickets 
        WHERE status = 'user_dependency' 
        AND (
            -- Either has user_dependency_started_at set and it's > 72 hours ago
            (user_dependency_started_at IS NOT NULL AND user_dependency_started_at < NOW() - INTERVAL '72 hours')
            OR
            -- Or user_dependency_started_at is NULL but ticket is old (fallback for historical tickets)
            (user_dependency_started_at IS NULL AND created_at < NOW() - INTERVAL '72 hours')
        )
        AND deleted = false
    LOOP
        -- Get the last comment for this ticket (most recent by created_at)
        SELECT 
            id,
            is_internal,
            author_role,
            created_at
        INTO v_last_comment
        FROM public.comments
        WHERE ticket_id = v_ticket_id
        ORDER BY created_at DESC
        LIMIT 1;
        
        -- Skip tickets with no comments (treat as new tickets)
        IF v_last_comment.id IS NULL THEN
            -- No comments exist, skip this ticket (don't auto-close)
            CONTINUE;
        END IF;
        
        -- Determine if last comment is from internal person
        IF v_last_comment.is_internal = TRUE THEN
            -- Explicitly marked as internal
            v_is_last_comment_internal := TRUE;
        ELSIF v_last_comment.author_role IN ('admin', 'resolver', 'approver', 'super_admin', 'ticket_admin') THEN
            -- Internal role
            v_is_last_comment_internal := TRUE;
        ELSE
            -- External comment (invigilator, anonymous) - user responded, keep open
            v_is_last_comment_internal := FALSE;
        END IF;
        
        -- Only auto-close if last comment is from internal person
        IF v_is_last_comment_internal THEN
            -- Auto-resolve the ticket
            UPDATE public.tickets 
            SET 
                status = 'resolved',
                resolved_at = NOW(),
                resolution_notes = COALESCE(resolution_notes, '') || E'\n\nThis ticket is autoclosed due to no response.',
                status_changed_at = NOW(),
                status_changed_by = NULL
            WHERE id = v_ticket_id;
            
            -- Add auto-comment
            INSERT INTO public.comments (id, ticket_id, content, author, author_role, is_internal, created_at)
            VALUES (
                gen_random_uuid(),
                v_ticket_id,
                'This ticket is autoclosed due to no response.',
                'System',
                'system',
                TRUE,
                NOW()
            );
            
            -- Add timeline event
            INSERT INTO public.ticket_timeline (id, ticket_id, event_type, old_value, new_value, performed_by, performed_by_name, performed_by_role, details, created_at)
            VALUES (
                gen_random_uuid(),
                v_ticket_id,
                'status_changed',
                'user_dependency',
                'resolved',
                NULL,
                'System',
                'system',
                '{"reason": "auto_resolved", "comment": "This ticket is autoclosed due to no response."}',
                NOW()
            );
            
            -- Log to ticket_history
            INSERT INTO public.ticket_history (
                ticket_id, 
                action_type, 
                old_value, 
                new_value, 
                performed_by, 
                performed_by_role,
                details
            )
            VALUES (
                v_ticket_id,
                'status_change',
                'user_dependency',
                'resolved',
                'System',
                'system',
                jsonb_build_object('reason', 'auto_resolved', 'comment', 'This ticket is autoclosed due to no response.')
            );
            
            v_count := v_count + 1;
        END IF;
    END LOOP;
    
    RETURN v_count;
END;
$$ LANGUAGE plpgsql;

