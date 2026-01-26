-- Fix missing SELECT policies for outcomes
-- This allows users to view existing outcomes

-- Drop existing SELECT policies
DROP POLICY IF EXISTS "Users can view outcomes they have access to" ON public.outcomes;
DROP POLICY IF EXISTS "Users can view outcomes" ON public.outcomes;
DROP POLICY IF EXISTS "Authenticated users can view outcomes" ON public.outcomes;

-- Create a permissive SELECT policy that allows all authenticated users to see outcomes
-- This is more permissive to ensure existing outcomes are visible
CREATE POLICY "Authenticated users can view outcomes"
  ON public.outcomes FOR SELECT
  TO authenticated
  USING (
    auth.role() = 'authenticated' AND
    (
      -- Public outcomes visible to all
      visibility = 'public' OR
      -- Private outcomes visible to owner
      (visibility = 'private' AND owner = auth.uid()) OR
      -- Team outcomes visible to team members or owner
      (visibility = 'team' AND (
        team_id IS NULL OR
        owner = auth.uid() OR
        EXISTS (
          SELECT 1 FROM public.team_memberships tm
          WHERE tm.team_id = outcomes.team_id
          AND tm.user_id = auth.uid()
        )
      )) OR
      -- Admins see everything
      EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role = 'admin'
      ) OR
      -- Fallback: if visibility is NULL or not set, allow authenticated users to see it
      -- This handles old data that might not have visibility set
      visibility IS NULL OR
      -- Also allow if user is the owner (regardless of visibility)
      owner = auth.uid()
    )
  );

-- Also fix opportunities SELECT policy
DROP POLICY IF EXISTS "Users can view opportunities" ON public.opportunities;
DROP POLICY IF EXISTS "Authenticated users can view opportunities" ON public.opportunities;

CREATE POLICY "Authenticated users can view opportunities"
  ON public.opportunities FOR SELECT
  TO authenticated
  USING (
    auth.role() = 'authenticated' AND
    EXISTS (
      SELECT 1 FROM public.outcomes o
      WHERE o.id = opportunities.outcome_id AND (
        o.visibility = 'public' OR
        (o.visibility = 'private' AND o.owner = auth.uid()) OR
        (o.visibility = 'team' AND (
          o.team_id IS NULL OR
          o.owner = auth.uid() OR
          EXISTS (
            SELECT 1 FROM public.team_memberships tm
            WHERE tm.team_id = o.team_id
            AND tm.user_id = auth.uid()
          )
        )) OR
        EXISTS (
          SELECT 1 FROM public.profiles
          WHERE id = auth.uid() AND role = 'admin'
        ) OR
        o.visibility IS NULL OR
        o.owner = auth.uid()
      )
    )
  );

-- Fix solutions SELECT policy
DROP POLICY IF EXISTS "Users can view solutions" ON public.solutions;
DROP POLICY IF EXISTS "Authenticated users can view solutions" ON public.solutions;

CREATE POLICY "Authenticated users can view solutions"
  ON public.solutions FOR SELECT
  TO authenticated
  USING (
    auth.role() = 'authenticated' AND
    EXISTS (
      SELECT 1 FROM public.opportunities opp
      JOIN public.outcomes o ON o.id = opp.outcome_id
      WHERE opp.id = solutions.opportunity_id AND (
        o.visibility = 'public' OR
        (o.visibility = 'private' AND o.owner = auth.uid()) OR
        (o.visibility = 'team' AND (
          o.team_id IS NULL OR
          o.owner = auth.uid() OR
          EXISTS (
            SELECT 1 FROM public.team_memberships tm
            WHERE tm.team_id = o.team_id
            AND tm.user_id = auth.uid()
          )
        )) OR
        EXISTS (
          SELECT 1 FROM public.profiles
          WHERE id = auth.uid() AND role = 'admin'
        ) OR
        o.visibility IS NULL OR
        o.owner = auth.uid()
      )
    )
  );

-- Fix tests SELECT policy
DROP POLICY IF EXISTS "Users can view tests" ON public.tests;
DROP POLICY IF EXISTS "Authenticated users can view tests" ON public.tests;

CREATE POLICY "Authenticated users can view tests"
  ON public.tests FOR SELECT
  TO authenticated
  USING (
    auth.role() = 'authenticated' AND
    EXISTS (
      SELECT 1 FROM public.solutions sol
      JOIN public.opportunities opp ON opp.id = sol.opportunity_id
      JOIN public.outcomes o ON o.id = opp.outcome_id
      WHERE sol.id = tests.solution_id AND (
        o.visibility = 'public' OR
        (o.visibility = 'private' AND o.owner = auth.uid()) OR
        (o.visibility = 'team' AND (
          o.team_id IS NULL OR
          o.owner = auth.uid() OR
          EXISTS (
            SELECT 1 FROM public.team_memberships tm
            WHERE tm.team_id = o.team_id
            AND tm.user_id = auth.uid()
          )
        )) OR
        EXISTS (
          SELECT 1 FROM public.profiles
          WHERE id = auth.uid() AND role = 'admin'
        ) OR
        o.visibility IS NULL OR
        o.owner = auth.uid()
      )
    )
  );

-- Fix KPIs SELECT policy
DROP POLICY IF EXISTS "Users can view KPIs" ON public.kpis;
DROP POLICY IF EXISTS "Authenticated users can view KPIs" ON public.kpis;

CREATE POLICY "Authenticated users can view KPIs"
  ON public.kpis FOR SELECT
  TO authenticated
  USING (
    auth.role() = 'authenticated' AND
    EXISTS (
      SELECT 1 FROM public.tests t
      JOIN public.solutions sol ON sol.id = t.solution_id
      JOIN public.opportunities opp ON opp.id = sol.opportunity_id
      JOIN public.outcomes o ON o.id = opp.outcome_id
      WHERE t.id = kpis.test_id AND (
        o.visibility = 'public' OR
        (o.visibility = 'private' AND o.owner = auth.uid()) OR
        (o.visibility = 'team' AND (
          o.team_id IS NULL OR
          o.owner = auth.uid() OR
          EXISTS (
            SELECT 1 FROM public.team_memberships tm
            WHERE tm.team_id = o.team_id
            AND tm.user_id = auth.uid()
          )
        )) OR
        EXISTS (
          SELECT 1 FROM public.profiles
          WHERE id = auth.uid() AND role = 'admin'
        ) OR
        o.visibility IS NULL OR
        o.owner = auth.uid()
      )
    )
  );

-- Verify policies were created
SELECT 
  schemaname, 
  tablename, 
  policyname, 
  cmd
FROM pg_policies
WHERE tablename IN ('outcomes', 'opportunities', 'solutions', 'tests', 'kpis')
  AND cmd = 'SELECT'
ORDER BY tablename, policyname;
