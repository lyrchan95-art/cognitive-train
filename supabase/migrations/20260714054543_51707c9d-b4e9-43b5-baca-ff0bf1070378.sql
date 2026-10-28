
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.set_updated_at() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
-- authenticated keeps EXECUTE on has_role — RLS policies invoke it as the calling role.
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
