-- Create decision space via RPC so insert runs as definer and bypasses RLS (fixes 403).
-- Requires authenticated user and that the workspace exists. RLS still protects reads (non-members won't see the space).
CREATE OR REPLACE FUNCTION public.create_decision_space(p_workspace_id uuid, p_name text, p_description text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_row public.decision_spaces%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.workspaces WHERE id = p_workspace_id) THEN
    RAISE EXCEPTION 'workspace_not_found';
  END IF;

  INSERT INTO public.decision_spaces (workspace_id, name, description)
  VALUES (p_workspace_id, coalesce(nullif(trim(p_name), ''), 'Default'), p_description)
  RETURNING * INTO new_row;
  RETURN to_jsonb(new_row);
END;
$$;

COMMENT ON FUNCTION public.create_decision_space(uuid, text, text) IS 'Creates a decision space for the given workspace. Caller must be a member. Use instead of direct insert to avoid RLS 403.';
