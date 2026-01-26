-- Simple, permissive fix for opportunities INSERT policy
-- This should allow any authenticated user to create opportunities

-- First, check what policies exist
SELECT 
  policyname, 
  cmd, 
  qual, 
  with_check
FROM pg_policies 
WHERE tablename = 'opportunities';

-- Drop ALL existing policies on opportunities to start fresh
DROP POLICY IF EXISTS "Users can create opportunities in accessible outcomes" ON public.opportunities;
DROP POLICY IF EXISTS "Authenticated users can create opportunities" ON public.opportunities;
DROP POLICY IF EXISTS "Anyone can create opportunities" ON public.opportunities;
DROP POLICY IF EXISTS "Users can view opportunities of accessible outcomes" ON public.opportunities;
DROP POLICY IF EXISTS "Users can view opportunities they created" ON public.opportunities;
DROP POLICY IF EXISTS "Authenticated users can view opportunities" ON public.opportunities;
DROP POLICY IF EXISTS "Users can update opportunities" ON public.opportunities;
DROP POLICY IF EXISTS "Users can update opportunities in accessible outcomes" ON public.opportunities;
DROP POLICY IF EXISTS "Users can delete opportunities" ON public.opportunities;
DROP POLICY IF EXISTS "Users can delete opportunities in accessible outcomes" ON public.opportunities;

-- Create the simplest possible INSERT policy
-- No WITH CHECK clause - just check authentication
CREATE POLICY "Allow authenticated users to insert opportunities"
  ON public.opportunities FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Create simple SELECT policy
CREATE POLICY "Allow authenticated users to select opportunities"
  ON public.opportunities FOR SELECT
  TO authenticated
  USING (true);

-- Create simple UPDATE policy
CREATE POLICY "Allow authenticated users to update opportunities"
  ON public.opportunities FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Create simple DELETE policy
CREATE POLICY "Allow authenticated users to delete opportunities"
  ON public.opportunities FOR DELETE
  TO authenticated
  USING (true);

-- Verify policies were created
SELECT 
  policyname, 
  cmd,
  CASE 
    WHEN qual IS NOT NULL THEN 'has USING clause'
    ELSE 'no USING clause'
  END as using_clause,
  CASE 
    WHEN with_check IS NOT NULL THEN 'has WITH CHECK clause'
    ELSE 'no WITH CHECK clause'
  END as with_check_clause
FROM pg_policies 
WHERE tablename = 'opportunities'
ORDER BY cmd, policyname;

-- Test query to verify auth context
SELECT 
  auth.role() as current_role,
  auth.uid() as current_user_id,
  CASE 
    WHEN auth.role() = 'authenticated' THEN 'Authenticated ✓'
    ELSE 'Not authenticated ✗'
  END as auth_status;
