-- Secure the users table by removing public exposure of sensitive columns and adding RPC for login

-- 1) Revoke SELECT on sensitive columns for anonymous and authenticated roles
REVOKE SELECT (pin, pin_hash) ON TABLE public.users FROM anon, authenticated;

-- 2) Create a SECURITY DEFINER function for mobile+PIN login that returns minimal, non-sensitive fields
CREATE OR REPLACE FUNCTION public.login_with_mobile_pin(
  p_mobile_number text,
  p_pin text
)
RETURNS TABLE (
  id uuid,
  name text,
  role text,
  city text,
  centre_code text,
  mobile_number text,
  is_active boolean
) AS $$
BEGIN
  RETURN QUERY
  SELECT u.id, u.name, u.role, u.city, u.centre_code, u.mobile_number, u.is_active
  FROM public.users u
  WHERE u.mobile_number = p_mobile_number
    AND u.is_active = true
    AND u.pin = p_pin
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 3) Allow clients to call the function
GRANT EXECUTE ON FUNCTION public.login_with_mobile_pin(text, text) TO anon, authenticated;