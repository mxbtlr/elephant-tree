-- Fix RLS policies for outcomes to ensure visibility and creation work
-- This migration fixes both SELECT (viewing) and INSERT (creating) issues

-- First, ensure helper functions exist
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

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view outcomes they have access to" ON public.outcomes;
DROP POLICY IF EXISTS "Authenticated users can create outcomes" ON public.outcomes;

-- Create a simple, permissive SELECT policy
-- This allows authenticated users to see:
-- 1. Public outcomes
-- 2. Their own outcomes (private or team)
-- 3. Team outcomes where they are members
-- 4. Outcomes with NULL visibility (old data)
-- 5. All outcomes if they are admin
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
    ) OR
    -- Owner can always see their own outcomes
    owner = auth.uid()
  );

-- Create a simple, permissive INSERT policy
-- This allows any authenticated user to create outcomes
CREATE POLICY "Authenticated users can create outcomes"
  ON public.outcomes FOR INSERT
  WITH CHECK (
    auth.role() = 'authenticated' AND
    auth.uid() IS NOT NULL
  );

-- Also ensure UPDATE policy is permissive enough
DROP POLICY IF EXISTS "Users can update outcomes they own or have team access" ON public.outcomes;

CREATE POLICY "Users can update outcomes they own or have team access"
  ON public.outcomes FOR UPDATE
  USING (
    owner = auth.uid() OR
    (team_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.team_memberships
      WHERE user_id = auth.uid() AND team_id = outcomes.team_id
    )) OR
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    ) OR
    visibility = 'public'
  );

