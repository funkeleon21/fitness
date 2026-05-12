-- Supabase-Default-Trigger `public.rls_auto_enable` ist SECURITY DEFINER
-- und ohne REVOKE per REST aufrufbar. Wir entziehen den HTTP-Pfad.
REVOKE EXECUTE ON FUNCTION public.rls_auto_enable() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.rls_auto_enable() FROM anon;
REVOKE EXECUTE ON FUNCTION public.rls_auto_enable() FROM authenticated;
