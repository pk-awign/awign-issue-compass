-- Hide the materialized view from the API to reduce security warnings
REVOKE SELECT ON public.ticket_analytics FROM anon, authenticated;