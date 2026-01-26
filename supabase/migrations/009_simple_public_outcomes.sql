-- Simple fix: Make public outcomes visible to all authenticated users
-- Also handle NULL visibility (for outcomes created before RLS)

-- Drop existing SELECT policy
DROP POLICY IF EXISTS "Users can view outcomes they have access to" ON public.outcomes;

-- Create simpler policy that definitely allows public outcomes
CREATE POLICY "Users can view outcomes they have access to"
  ON public.outcomes FOR SELECT
  USING (
    -- Public outcomes: visible to all authenticated users
    visibility = 'public' OR
    -- Private outcomes: only owner
    (visibility = 'private' AND owner = auth.uid()) OR
    -- Team outcomes: team members or owner
    (visibility = 'team' AND (
      team_id IS NULL OR
      owner = auth.uid() OR
      EXISTS (
        SELECT 1 FROM public.team_memberships
        WHERE user_id = auth.uid() AND team_id = outcomes.team_id
      )
    )) OR
    -- NULL visibility (old data): allow all authenticated users
    (visibility IS NULL AND auth.role() = 'authenticated') OR
    -- Admin can see everything
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

