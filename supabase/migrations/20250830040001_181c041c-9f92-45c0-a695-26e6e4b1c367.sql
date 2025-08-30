-- Enable RLS on tables that don't have it enabled yet
ALTER TABLE public.status_transitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_admin_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_assignees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_timeline ENABLE ROW LEVEL SECURITY;

-- Create basic RLS policies for these tables
CREATE POLICY "Allow authenticated users to read status_transitions" 
  ON public.status_transitions FOR SELECT 
  TO authenticated 
  USING (true);

CREATE POLICY "Allow authenticated users to read ticket_admin_assignments" 
  ON public.ticket_admin_assignments FOR SELECT 
  TO authenticated 
  USING (true);

CREATE POLICY "Allow authenticated users to read ticket_assignees" 
  ON public.ticket_assignees FOR SELECT 
  TO authenticated 
  USING (true);

CREATE POLICY "Allow authenticated users to read ticket_timeline" 
  ON public.ticket_timeline FOR SELECT 
  TO authenticated 
  USING (true);

-- Create additional secure RPC for user registration
CREATE OR REPLACE FUNCTION public.register_user_with_mobile_pin(
  p_mobile_number text,
  p_name text,
  p_pin text,
  p_city text DEFAULT NULL,
  p_centre_code text DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  name text,
  role text,
  city text,
  centre_code text,
  mobile_number text,
  is_active boolean,
  success boolean,
  error_message text
) AS $$
DECLARE
  v_existing_user_id uuid;
  v_new_user_id uuid;
BEGIN
  -- Check if user already exists
  SELECT u.id INTO v_existing_user_id
  FROM public.users u
  WHERE u.mobile_number = p_mobile_number;
  
  IF v_existing_user_id IS NOT NULL THEN
    -- User already exists
    RETURN QUERY
    SELECT null::uuid, null::text, null::text, null::text, null::text, null::text, false, false, 'Mobile number already registered';
    RETURN;
  END IF;
  
  -- Validate PIN is exactly 4 digits
  IF length(p_pin) != 4 OR p_pin !~ '^[0-9]{4}$' THEN
    RETURN QUERY
    SELECT null::uuid, null::text, null::text, null::text, null::text, null::text, false, false, 'PIN must be exactly 4 digits';
    RETURN;
  END IF;
  
  -- Insert new user
  INSERT INTO public.users (mobile_number, name, pin, pin_hash, city, centre_code, role)
  VALUES (p_mobile_number, p_name, p_pin, '', p_city, p_centre_code, 'public_user')
  RETURNING users.id INTO v_new_user_id;
  
  -- Return the new user data
  RETURN QUERY
  SELECT v_new_user_id, p_name, 'public_user'::text, p_city, p_centre_code, p_mobile_number, true, true, null::text;
  
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.register_user_with_mobile_pin(text, text, text, text, text) TO anon, authenticated;

-- Fix search_path for existing functions
ALTER FUNCTION public.auto_resolve_user_dependency_tickets() SET search_path = public;
ALTER FUNCTION public.set_user_dependency_started_at() SET search_path = public;
ALTER FUNCTION public.validate_status_transition(uuid, ticket_status_new, ticket_status_new, character varying) SET search_path = public;
ALTER FUNCTION public.validate_assignment_permission(character varying, character varying) SET search_path = public;
ALTER FUNCTION public.calculate_resolution_time() SET search_path = public;
ALTER FUNCTION public.log_ticket_history() SET search_path = public;
ALTER FUNCTION public.log_comment_history() SET search_path = public;
ALTER FUNCTION public.update_user_activity() SET search_path = public;
ALTER FUNCTION public.refresh_ticket_analytics() SET search_path = public;