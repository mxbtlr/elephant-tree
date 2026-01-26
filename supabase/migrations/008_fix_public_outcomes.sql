-- Fix RLS policies to ensure public outcomes are visible to all authenticated users

-- Drop and recreate the SELECT policy for outcomes
DROP POLICY IF EXISTS "Users can view outcomes they have access to" ON public.outcomes;

CREATE POLICY "Users can view outcomes they have access to"
  ON public.outcomes FOR SELECT
  USING (
    -- Public outcomes are visible to all authenticated users
    visibility = 'public' OR
    -- Private outcomes only to owner
    (visibility = 'private' AND owner = auth.uid()) OR
    -- Team outcomes to team members or owner
    (visibility = 'team' AND (
      team_id IS NULL OR
      owner = auth.uid() OR
      public.is_team_member(auth.uid(), team_id)
    )) OR
    -- Admins can see everything
    public.is_admin(auth.uid()) OR
    -- If visibility is not set (old data), allow if user is authenticated
    (visibility IS NULL AND auth.role() = 'authenticated')
  );

-- Also fix opportunities SELECT policy
DROP POLICY IF EXISTS "Users can view opportunities of accessible outcomes" ON public.opportunities;

CREATE POLICY "Users can view opportunities of accessible outcomes"
  ON public.opportunities FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.outcomes
      WHERE id = opportunities.outcome_id AND (
        visibility = 'public' OR
        (visibility = 'private' AND owner = auth.uid()) OR
        (visibility = 'team' AND (
          team_id IS NULL OR
          owner = auth.uid() OR
          public.is_team_member(auth.uid(), team_id)
        )) OR
        public.is_admin(auth.uid()) OR
        (visibility IS NULL AND auth.role() = 'authenticated')
      )
    )
  );

-- Fix solutions SELECT policy
DROP POLICY IF EXISTS "Users can view solutions of accessible opportunities" ON public.solutions;

CREATE POLICY "Users can view solutions of accessible opportunities"
  ON public.solutions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.opportunities opp
      JOIN public.outcomes o ON o.id = opp.outcome_id
      WHERE opp.id = solutions.opportunity_id AND (
        o.visibility = 'public' OR
        (o.visibility = 'private' AND o.owner = auth.uid()) OR
        (o.visibility = 'team' AND (
          o.team_id IS NULL OR
          o.owner = auth.uid() OR
          public.is_team_member(auth.uid(), o.team_id)
        )) OR
        public.is_admin(auth.uid()) OR
        (o.visibility IS NULL AND auth.role() = 'authenticated')
      )
    )
  );

-- Fix tests SELECT policy
DROP POLICY IF EXISTS "Users can view tests of accessible solutions" ON public.tests;

CREATE POLICY "Users can view tests of accessible solutions"
  ON public.tests FOR SELECT
  USING (
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
          public.is_team_member(auth.uid(), o.team_id)
        )) OR
        public.is_admin(auth.uid()) OR
        (o.visibility IS NULL AND auth.role() = 'authenticated')
      )
    )
  );

-- Fix KPIs SELECT policy
DROP POLICY IF EXISTS "Users can view KPIs of accessible tests" ON public.kpis;

CREATE POLICY "Users can view KPIs of accessible tests"
  ON public.kpis FOR SELECT
  USING (
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
          public.is_team_member(auth.uid(), o.team_id)
        )) OR
        public.is_admin(auth.uid()) OR
        (o.visibility IS NULL AND auth.role() = 'authenticated')
      )
    )
  );

