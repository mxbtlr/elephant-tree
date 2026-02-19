-- Fix duplicate personal workspaces and Default decision spaces: cleanup, add uniqueness, make RPC idempotent.

-- ---------------------------------------------------------------------------
-- 1. Cleanup duplicate "Default" decision spaces (keep oldest per workspace)
-- ---------------------------------------------------------------------------
WITH kept_default AS (
  SELECT DISTINCT ON (workspace_id) id, workspace_id
  FROM public.decision_spaces
  WHERE name = 'Default'
  ORDER BY workspace_id, created_at ASC
),
duplicate_defaults AS (
  SELECT ds.id
  FROM public.decision_spaces ds
  WHERE ds.name = 'Default'
    AND NOT EXISTS (SELECT 1 FROM kept_default k WHERE k.id = ds.id)
)
UPDATE public.outcomes o
SET decision_space_id = k.id
FROM kept_default k, duplicate_defaults d
WHERE o.decision_space_id = d.id
  AND o.workspace_id = k.workspace_id;

DELETE FROM public.decision_spaces
WHERE name = 'Default'
  AND id NOT IN (
    SELECT id FROM (
      SELECT DISTINCT ON (workspace_id) id
      FROM public.decision_spaces
      WHERE name = 'Default'
      ORDER BY workspace_id, created_at ASC
    ) kept
  );

-- ---------------------------------------------------------------------------
-- 2. Cleanup duplicate personal workspaces (keep oldest per owner_id)
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  -- Reassign outcomes (workspace_id + decision_space_id) then child tables, then delete duplicate workspaces
  WITH kept_personal AS (
    SELECT DISTINCT ON (w.owner_id) w.id, w.owner_id,
      (SELECT ds.id FROM public.decision_spaces ds WHERE ds.workspace_id = w.id AND ds.name = 'Default' ORDER BY ds.created_at ASC LIMIT 1) AS default_space_id
    FROM public.workspaces w
    WHERE w.type = 'personal'
    ORDER BY w.owner_id, w.created_at ASC
  ),
  duplicate_personal AS (
    SELECT w.id
    FROM public.workspaces w
    WHERE w.type = 'personal'
      AND NOT EXISTS (SELECT 1 FROM kept_personal k WHERE k.id = w.id)
  )
  UPDATE public.outcomes o
  SET workspace_id = k.id, decision_space_id = COALESCE(o.decision_space_id, k.default_space_id)
  FROM kept_personal k, duplicate_personal d
  WHERE o.workspace_id = d.id
    AND k.owner_id = (SELECT owner_id FROM public.workspaces WHERE id = d.id LIMIT 1);

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'opportunities') THEN
    WITH kept_personal AS (
      SELECT DISTINCT ON (owner_id) id, owner_id FROM public.workspaces WHERE type = 'personal' ORDER BY owner_id, created_at ASC
    ),
    duplicate_personal AS (
      SELECT w.id FROM public.workspaces w WHERE w.type = 'personal' AND NOT EXISTS (SELECT 1 FROM kept_personal k WHERE k.id = w.id)
    )
    UPDATE public.opportunities o SET workspace_id = k.id
    FROM kept_personal k, duplicate_personal d
    WHERE o.workspace_id = d.id AND k.owner_id = (SELECT owner_id FROM public.workspaces WHERE id = d.id LIMIT 1);
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'solutions') THEN
    WITH kept_personal AS (
      SELECT DISTINCT ON (owner_id) id, owner_id FROM public.workspaces WHERE type = 'personal' ORDER BY owner_id, created_at ASC
    ),
    duplicate_personal AS (
      SELECT w.id FROM public.workspaces w WHERE w.type = 'personal' AND NOT EXISTS (SELECT 1 FROM kept_personal k WHERE k.id = w.id)
    )
    UPDATE public.solutions s SET workspace_id = k.id
    FROM kept_personal k, duplicate_personal d
    WHERE s.workspace_id = d.id AND k.owner_id = (SELECT owner_id FROM public.workspaces WHERE id = d.id LIMIT 1);
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'tests') THEN
    WITH kept_personal AS (
      SELECT DISTINCT ON (owner_id) id, owner_id FROM public.workspaces WHERE type = 'personal' ORDER BY owner_id, created_at ASC
    ),
    duplicate_personal AS (
      SELECT w.id FROM public.workspaces w WHERE w.type = 'personal' AND NOT EXISTS (SELECT 1 FROM kept_personal k WHERE k.id = w.id)
    )
    UPDATE public.tests t SET workspace_id = k.id
    FROM kept_personal k, duplicate_personal d
    WHERE t.workspace_id = d.id AND k.owner_id = (SELECT owner_id FROM public.workspaces WHERE id = d.id LIMIT 1);
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'evidence_items') THEN
    WITH kept_personal AS (
      SELECT DISTINCT ON (owner_id) id, owner_id FROM public.workspaces WHERE type = 'personal' ORDER BY owner_id, created_at ASC
    ),
    duplicate_personal AS (
      SELECT w.id FROM public.workspaces w WHERE w.type = 'personal' AND NOT EXISTS (SELECT 1 FROM kept_personal k WHERE k.id = w.id)
    )
    UPDATE public.evidence_items ei SET workspace_id = k.id
    FROM kept_personal k, duplicate_personal d
    WHERE ei.workspace_id = d.id AND k.owner_id = (SELECT owner_id FROM public.workspaces WHERE id = d.id LIMIT 1);
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'experiment_todos') THEN
    WITH kept_personal AS (
      SELECT DISTINCT ON (owner_id) id, owner_id FROM public.workspaces WHERE type = 'personal' ORDER BY owner_id, created_at ASC
    ),
    duplicate_personal AS (
      SELECT w.id FROM public.workspaces w WHERE w.type = 'personal' AND NOT EXISTS (SELECT 1 FROM kept_personal k WHERE k.id = w.id)
    )
    UPDATE public.experiment_todos et SET workspace_id = k.id
    FROM kept_personal k, duplicate_personal d
    WHERE et.workspace_id = d.id AND k.owner_id = (SELECT owner_id FROM public.workspaces WHERE id = d.id LIMIT 1);
  END IF;

  DELETE FROM public.workspaces
  WHERE type = 'personal'
    AND id NOT IN (
      SELECT id FROM (SELECT DISTINCT ON (owner_id) id FROM public.workspaces WHERE type = 'personal' ORDER BY owner_id, created_at ASC) kept
    );
END $$;

-- ---------------------------------------------------------------------------
-- 3. Add partial unique index: one personal workspace per owner
-- ---------------------------------------------------------------------------
CREATE UNIQUE INDEX IF NOT EXISTS workspaces_owner_personal_uniq
  ON public.workspaces (owner_id) WHERE (type = 'personal');

-- ---------------------------------------------------------------------------
-- 4. Add unique index: one decision space per (workspace_id, name)
-- ---------------------------------------------------------------------------
CREATE UNIQUE INDEX IF NOT EXISTS decision_spaces_workspace_name_uniq
  ON public.decision_spaces (workspace_id, name);

-- ---------------------------------------------------------------------------
-- 5. Idempotent create_my_default_workspace: ON CONFLICT return existing
-- ---------------------------------------------------------------------------
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
  user_email text;
BEGIN
  uid := auth.uid();
  IF uid IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_authenticated');
  END IF;

  -- Insert personal workspace or do nothing; get id (existing or new)
  INSERT INTO public.workspaces (name, type, owner_id)
  VALUES ('Personal Workspace', 'personal', uid)
  ON CONFLICT (owner_id) WHERE (type = 'personal') DO NOTHING;

  SELECT id INTO wid FROM public.workspaces WHERE owner_id = uid AND type = 'personal' LIMIT 1;
  IF wid IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'workspace_insert_failed');
  END IF;

  -- Ensure workspace_members row (idempotent: unique on workspace_id, user_id)
  SELECT coalesce(email, 'user-' || uid::text || '@local') FROM auth.users WHERE id = uid INTO user_email;
  INSERT INTO public.workspace_members (workspace_id, user_id, role, status, email)
  VALUES (wid, uid, 'owner', 'active', lower(user_email))
  ON CONFLICT (workspace_id, user_id) WHERE (user_id IS NOT NULL) DO NOTHING;

  -- Insert Default decision space or do nothing; get id (existing or new)
  INSERT INTO public.decision_spaces (workspace_id, name)
  VALUES (wid, 'Default')
  ON CONFLICT (workspace_id, name) DO NOTHING;

  SELECT id INTO dsid FROM public.decision_spaces WHERE workspace_id = wid AND name = 'Default' LIMIT 1;

  RETURN jsonb_build_object('ok', true, 'created', true, 'workspace_id', wid, 'decision_space_id', dsid);
END;
$$;

COMMENT ON FUNCTION public.create_my_default_workspace() IS 'Creates a default personal workspace and Default decision space for the current user if they have none. Idempotent: returns existing if already present.';
