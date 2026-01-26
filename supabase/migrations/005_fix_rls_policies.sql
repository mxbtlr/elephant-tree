-- Fix RLS policies for self-hosted Supabase
-- This ensures authenticated users can create and manage their own data

-- First, create helper functions if they don't exist
CREATE OR REPLACE FUNCTION public.is_admin(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = user_id AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.is_team_member(user_id UUID, team_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.team_memberships
    WHERE user_id = is_team_member.user_id AND team_id = is_team_member.team_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.get_team_role(user_id UUID, team_id UUID)
RETURNS TEXT AS $$
BEGIN
  RETURN (
    SELECT role FROM public.team_memberships
    WHERE user_id = get_team_role.user_id AND team_id = get_team_role.team_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing policies that might be too restrictive
DROP POLICY IF EXISTS "Authenticated users can create outcomes" ON public.outcomes;
DROP POLICY IF EXISTS "Users can create opportunities in accessible outcomes" ON public.opportunities;
DROP POLICY IF EXISTS "Users can manage solutions in accessible opportunities" ON public.solutions;
DROP POLICY IF EXISTS "Users can manage tests in accessible solutions" ON public.tests;
DROP POLICY IF EXISTS "Users can manage KPIs in accessible tests" ON public.kpis;

-- Recreate outcomes INSERT policy (more permissive for authenticated users)
CREATE POLICY "Authenticated users can create outcomes"
  ON public.outcomes FOR INSERT
  WITH CHECK (
    auth.role() = 'authenticated' OR
    auth.uid() IS NOT NULL
  );

-- Recreate opportunities INSERT policy
CREATE POLICY "Users can create opportunities in accessible outcomes"
  ON public.opportunities FOR INSERT
  WITH CHECK (
    (auth.role() = 'authenticated' OR auth.uid() IS NOT NULL) AND
    EXISTS (
      SELECT 1 FROM public.outcomes
      WHERE id = opportunities.outcome_id AND (
        visibility = 'public' OR
        (visibility = 'private' AND owner = auth.uid()) OR
        (visibility = 'team' AND (
          team_id IS NULL OR
          public.is_team_member(auth.uid(), team_id) OR
          owner = auth.uid()
        )) OR
        public.is_admin(auth.uid())
      )
    )
  );

-- Recreate solutions INSERT policy
CREATE POLICY "Users can create solutions in accessible opportunities"
  ON public.solutions FOR INSERT
  WITH CHECK (
    (auth.role() = 'authenticated' OR auth.uid() IS NOT NULL) AND
    EXISTS (
      SELECT 1 FROM public.opportunities opp
      JOIN public.outcomes o ON o.id = opp.outcome_id
      WHERE opp.id = solutions.opportunity_id AND (
        o.visibility = 'public' OR
        (o.visibility = 'private' AND o.owner = auth.uid()) OR
        (o.visibility = 'team' AND (
          o.team_id IS NULL OR
          public.is_team_member(auth.uid(), o.team_id) OR
          o.owner = auth.uid()
        )) OR
        public.is_admin(auth.uid())
      )
    )
  );

-- Recreate tests INSERT policy
CREATE POLICY "Users can create tests in accessible solutions"
  ON public.tests FOR INSERT
  WITH CHECK (
    (auth.role() = 'authenticated' OR auth.uid() IS NOT NULL) AND
    EXISTS (
      SELECT 1 FROM public.solutions sol
      JOIN public.opportunities opp ON opp.id = sol.opportunity_id
      JOIN public.outcomes o ON o.id = opp.outcome_id
      WHERE sol.id = tests.solution_id AND (
        o.visibility = 'public' OR
        (o.visibility = 'private' AND o.owner = auth.uid()) OR
        (o.visibility = 'team' AND (
          o.team_id IS NULL OR
          public.is_team_member(auth.uid(), o.team_id) OR
          o.owner = auth.uid()
        )) OR
        public.is_admin(auth.uid())
      )
    )
  );

-- Recreate KPIs INSERT policy
CREATE POLICY "Users can create KPIs in accessible tests"
  ON public.kpis FOR INSERT
  WITH CHECK (
    (auth.role() = 'authenticated' OR auth.uid() IS NOT NULL) AND
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
          public.is_team_member(auth.uid(), o.team_id) OR
          o.owner = auth.uid()
        )) OR
        public.is_admin(auth.uid())
      )
    )
  );

-- Also fix UPDATE policies to be more permissive
DROP POLICY IF EXISTS "Users can update outcomes they own or have team access" ON public.outcomes;
CREATE POLICY "Users can update outcomes they own or have team access"
  ON public.outcomes FOR UPDATE
  USING (
    owner = auth.uid() OR
    (team_id IS NOT NULL AND (
      public.is_team_member(auth.uid(), team_id) OR
      owner = auth.uid()
    )) OR
    public.is_admin(auth.uid()) OR
    visibility = 'public'
  );

