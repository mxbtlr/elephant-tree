-- Creates default personal workspace and "Default" decision space for the current user if they have none.
-- Requires 040_workspaces and 042_decision_spaces. Call after signup or when workspace list is empty.
-- Inserts owner into workspace_members so RLS on decision_spaces (is_workspace_member) passes for client writes.
CREATE OR REPLACE FUNCTION public.create_my_default_workspace()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid;
  wid uuid;
  dsid uuid;
  has_any boolean;
  user_email text;
BEGIN
  uid := auth.uid();
  IF uid IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_authenticated');
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.workspaces w
    WHERE w.owner_id = uid
    LIMIT 1
  ) INTO has_any;

  IF has_any THEN
    RETURN jsonb_build_object('ok', true, 'created', false);
  END IF;

  INSERT INTO public.workspaces (name, type, owner_id)
  VALUES ('Personal Workspace', 'personal', uid)
  RETURNING id INTO wid;

  SELECT coalesce(email, 'user-' || uid::text || '@local') FROM auth.users WHERE id = uid INTO user_email;
  INSERT INTO public.workspace_members (workspace_id, user_id, role, status, email)
  VALUES (wid, uid, 'owner', 'active', lower(user_email));

  INSERT INTO public.decision_spaces (workspace_id, name)
  VALUES (wid, 'Default')
  RETURNING id INTO dsid;

  RETURN jsonb_build_object('ok', true, 'created', true, 'workspace_id', wid, 'decision_space_id', dsid);
END;
$$;

COMMENT ON FUNCTION public.create_my_default_workspace() IS 'Creates a default personal workspace and decision space for the current user if they have none. Call after signup or when workspace list is empty.';
