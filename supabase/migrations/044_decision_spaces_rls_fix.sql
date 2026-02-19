-- Fix 403 on decision_spaces: ensure every workspace owner has a workspace_members row
-- so is_workspace_member() returns true for client INSERTs (RLS with check).
INSERT INTO public.workspace_members (workspace_id, user_id, role, status, email)
SELECT w.id,
       w.owner_id,
       'owner',
       'active',
       lower(coalesce(
         (SELECT email FROM auth.users u WHERE u.id = w.owner_id),
         (SELECT email FROM public.profiles p WHERE p.id = w.owner_id),
         'owner-' || w.owner_id::text || '@local'
       ))
FROM public.workspaces w
WHERE NOT EXISTS (
  SELECT 1 FROM public.workspace_members wm
  WHERE wm.workspace_id = w.id AND wm.user_id = w.owner_id
);

-- Separate policies so INSERT is explicitly allowed when is_workspace_member (fixes 403)
DROP POLICY IF EXISTS "Decision spaces read" ON public.decision_spaces;
DROP POLICY IF EXISTS "Decision spaces write" ON public.decision_spaces;
CREATE POLICY "Decision spaces read" ON public.decision_spaces
  FOR SELECT USING (public.is_workspace_member(decision_spaces.workspace_id));
CREATE POLICY "Decision spaces insert" ON public.decision_spaces
  FOR INSERT WITH CHECK (public.is_workspace_member(decision_spaces.workspace_id));
CREATE POLICY "Decision spaces update" ON public.decision_spaces
  FOR UPDATE USING (public.is_workspace_member(decision_spaces.workspace_id))
  WITH CHECK (public.is_workspace_member(decision_spaces.workspace_id));
CREATE POLICY "Decision spaces delete" ON public.decision_spaces
  FOR DELETE USING (public.is_workspace_member(decision_spaces.workspace_id));
