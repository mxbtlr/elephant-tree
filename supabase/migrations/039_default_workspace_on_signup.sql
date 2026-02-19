-- Deprecated: RPC moved to 043_default_workspace_on_signup.sql (runs after 040/042 so tables exist).
-- This migration is a no-op so existing installs are not broken; 043 defines create_my_default_workspace().
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'workspaces')
     AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'decision_spaces') THEN
    -- Tables exist (e.g. from supabase/040 and 042); create function so old migration order still works
    CREATE OR REPLACE FUNCTION public.create_my_default_workspace()
    RETURNS jsonb
    LANGUAGE plpgsql
    SECURITY DEFINER
    SET search_path = public
    AS $fn$
    DECLARE
      uid uuid;
      wid uuid;
      dsid uuid;
      has_any boolean;
    BEGIN
      uid := auth.uid();
      IF uid IS NULL THEN
        RETURN jsonb_build_object('ok', false, 'error', 'not_authenticated');
      END IF;
      SELECT EXISTS (SELECT 1 FROM public.workspaces w WHERE w.owner_id = uid LIMIT 1) INTO has_any;
      IF has_any THEN
        RETURN jsonb_build_object('ok', true, 'created', false);
      END IF;
      INSERT INTO public.workspaces (name, type, owner_id)
      VALUES ('Personal Workspace', 'personal', uid)
      RETURNING id INTO wid;
      INSERT INTO public.decision_spaces (workspace_id, name)
      VALUES (wid, 'Default')
      RETURNING id INTO dsid;
      RETURN jsonb_build_object('ok', true, 'created', true, 'workspace_id', wid, 'decision_space_id', dsid);
    END;
    $fn$;
  END IF;
END $$;
