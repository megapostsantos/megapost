
-- Fix views to use SECURITY INVOKER (safe - queries run as the calling user)
ALTER VIEW public.v_routes_monthly SET (security_invoker = on);
ALTER VIEW public.v_driver_monthly SET (security_invoker = on);
