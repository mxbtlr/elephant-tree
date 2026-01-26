-- Final fix for opportunities INSERT policy
-- This ensures any authenticated user can create opportunities

-- Drop all existing INSERT policies on opportunities
DROP POLICY IF EXISTS "Users can create opportunities in accessible outcomes" ON public.opportunities;
DROP POLICY IF EXISTS "Authenticated users can create opportunities" ON public.opportunities;
DROP POLICY IF EXISTS "Anyone can create opportunities" ON public.opportunities;

-- Create the simplest possible policy that just checks authentication
CREATE POLICY "Authenticated users can create opportunities"
  ON public.opportunities FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.role() = 'authenticated'
  );

-- Also ensure SELECT policy allows users to see opportunities they created
-- This helps with the .select() call after insert
DROP POLICY IF EXISTS "Users can view opportunities of accessible outcomes" ON public.opportunities;
DROP POLICY IF EXISTS "Authenticated users can view opportunities" ON public.opportunities;

CREATE POLICY "Users can view opportunities they created"
  ON public.opportunities FOR SELECT
  TO authenticated
  USING (
    auth.role() = 'authenticated' AND
    (
      owner = auth.uid() OR
      EXISTS (
        SELECT 1 FROM public.outcomes o
        WHERE o.id = opportunities.outcome_id
        AND (
          o.owner = auth.uid() OR
          o.visibility = 'public' OR
          (
            o.visibility = 'team' AND
            EXISTS (
              SELECT 1 FROM public.team_memberships tm
              WHERE tm.team_id = o.team_id
              AND tm.user_id = auth.uid()
            )
          )
        )
      )
    )
  );

-- Verify the policy was created
SELECT 
  schemaname, 
  tablename, 
  policyname, 
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'opportunities'
ORDER BY policyname;
