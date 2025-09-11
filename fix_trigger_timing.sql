-- Fix trigger timing issue - change from BEFORE to AFTER INSERT/UPDATE
-- This ensures the ticket exists before we try to log to ticket_history

-- Drop the existing trigger
DROP TRIGGER IF EXISTS ticket_timeline_trigger ON public.tickets;

-- Recreate the trigger with AFTER timing
CREATE TRIGGER ticket_timeline_trigger
    AFTER INSERT OR UPDATE ON public.tickets
    FOR EACH ROW
    EXECUTE FUNCTION public.ticket_timeline_trigger();

-- Verify the trigger was recreated with correct timing
SELECT 
    trigger_name,
    event_manipulation,
    action_timing,
    action_statement
FROM information_schema.triggers 
WHERE event_object_table = 'tickets' 
AND trigger_name = 'ticket_timeline_trigger';
