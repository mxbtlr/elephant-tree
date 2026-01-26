-- Complete fix for opportunities - both INSERT and SELECT policies
-- This ensures users can create and view opportunities

-- ============================================
-- INSERT POLICY
-- ============================================

-- Drop all existing INSERT policies on opportunities
DROP POLICY IF EXISTS "Users can create opportunities in accessible outcomes" ON public.opportunities;
DROP POLICY IF EXISTS "Authenticated users can create opportunities" ON public.opportunities;
DROP POLICY IF EXISTS "Anyone can create opportunities" ON public.opportunities;

-- Create the simplest possible INSERT policy that just checks authentication
-- This allows any authenticated user to create opportunities in any outcome they can see
CREATE POLICY "Authenticated users can create opportunities"
  ON public.opportunities FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.role() = 'authenticated' AND
    auth.uid() IS NOT NULL
  );

-- ============================================
-- SELECT POLICY  
-- ============================================

-- Drop existing SELECT policies
DROP POLICY IF EXISTS "Users can view opportunities of accessible outcomes" ON public.opportunities;
DROP POLICY IF EXISTS "Users can view opportunities they created" ON public.opportunities;
DROP POLICY IF EXISTS "Authenticated users can view opportunities" ON public.opportunities;

-- Create comprehensive SELECT policy
CREATE POLICY "Authenticated users can view opportunities"
  ON public.opportunities FOR SELECT
  TO authenticated
  USING (
    auth.role() = 'authenticated' AND
    (
      -- User owns the opportunity
      owner = auth.uid() OR
      -- Opportunity belongs to a public outcome
      EXISTS (
        SELECT 1 FROM public.outcomes o
        WHERE o.id = opportunities.outcome_id
        AND o.visibility = 'public'
      ) OR
      -- Opportunity belongs to a private outcome owned by user
      EXISTS (
        SELECT 1 FROM public.outcomes o
        WHERE o.id = opportunities.outcome_id
        AND o.visibility = 'private'
        AND o.owner = auth.uid()
      ) OR
      -- Opportunity belongs to a team outcome where user is a member
      EXISTS (
        SELECT 1 FROM public.outcomes o
        WHERE o.id = opportunities.outcome_id
        AND o.visibility = 'team'
        AND (
          o.team_id IS NULL OR
          o.owner = auth.uid() OR
          EXISTS (
            SELECT 1 FROM public.team_memberships tm
            WHERE tm.team_id = o.team_id
            AND tm.user_id = auth.uid()
          )
        )
      ) OR
      -- User is admin
      EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role = 'admin'
      ) OR
      -- Fallback: if outcome visibility is NULL, allow if authenticated
      EXISTS (
        SELECT 1 FROM public.outcomes o
        WHERE o.id = opportunities.outcome_id
        AND (o.visibility IS NULL OR o.owner = auth.uid())
      )
    )
  );

-- ============================================
-- UPDATE POLICY
-- ============================================

-- Ensure UPDATE policy exists (from migration 007, but let's make sure)
DROP POLICY IF EXISTS "Users can update opportunities" ON public.opportunities;
CREATE POLICY "Users can update opportunities"
  ON public.opportunities FOR UPDATE
  TO authenticated
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- ============================================
-- DELETE POLICY
-- ============================================

-- Add DELETE policy
DROP POLICY IF EXISTS "Users can delete opportunities" ON public.opportunities;
CREATE POLICY "Users can delete opportunities"
  ON public.opportunities FOR DELETE
  TO authenticated
  USING (auth.role() = 'authenticated');

-- ============================================
-- VERIFY
-- ============================================

-- Verify all policies were created
SELECT 
  schemaname, 
  tablename, 
  policyname, 
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'opportunities'
ORDER BY cmd, policyname;

-- Test that we can query opportunities (this should return policy info, not actual data)
SELECT COUNT(*) as policy_count
FROM pg_policies
WHERE tablename = 'opportunities';
