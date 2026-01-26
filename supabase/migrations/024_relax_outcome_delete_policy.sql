-- Allow team members (not just leads) to delete outcomes they have access to
DROP POLICY IF EXISTS "Users can delete outcomes they own or are team leads" ON public.outcomes;

CREATE POLICY "Users can delete outcomes they own or have team access"
  ON public.outcomes FOR DELETE
  USING (
    owner = auth.uid() OR
    (team_id IS NOT NULL AND public.is_team_member(auth.uid(), team_id)) OR
    public.is_admin(auth.uid())
  );
