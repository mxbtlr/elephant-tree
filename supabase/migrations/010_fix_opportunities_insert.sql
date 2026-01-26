-- Fix opportunities INSERT policy to be more permissive
-- This allows authenticated users to create opportunities in outcomes they can view

-- Drop the existing restrictive policy
DROP POLICY IF EXISTS "Users can create opportunities in accessible outcomes" ON public.opportunities;

-- Create a simpler, more permissive policy
-- Allow authenticated users to create opportunities if:
-- 1. They are authenticated
-- 2. The outcome exists and they can view it (or it's public, or they own it, or they're in the team)
CREATE POLICY "Users can create opportunities in accessible outcomes"
  ON public.opportunities FOR INSERT
  WITH CHECK (
    -- User must be authenticated
    auth.uid() IS NOT NULL AND
    -- Check if the outcome is accessible
    EXISTS (
      SELECT 1 FROM public.outcomes o
      WHERE o.id = opportunities.outcome_id AND (
        -- Public outcomes: anyone can create opportunities
        o.visibility = 'public' OR
        -- Private outcomes: only owner can create opportunities
        (o.visibility = 'private' AND o.owner = auth.uid()) OR
        -- Team outcomes: team members or owner can create opportunities
        (o.visibility = 'team' AND (
          o.team_id IS NULL OR
          o.owner = auth.uid() OR
          EXISTS (
            SELECT 1 FROM public.team_memberships tm
            WHERE tm.team_id = o.team_id AND tm.user_id = auth.uid()
          )
        )) OR
        -- Admins can create opportunities in any outcome
        EXISTS (
          SELECT 1 FROM public.profiles p
          WHERE p.id = auth.uid() AND p.role = 'admin'
        )
      )
    )
  );

-- Alternative: Even simpler policy - allow any authenticated user to create opportunities
-- (if you want to be more permissive, uncomment this and comment out the above)
-- DROP POLICY IF EXISTS "Users can create opportunities in accessible outcomes" ON public.opportunities;
-- CREATE POLICY "Authenticated users can create opportunities"
--   ON public.opportunities FOR INSERT
--   WITH CHECK (auth.uid() IS NOT NULL);

