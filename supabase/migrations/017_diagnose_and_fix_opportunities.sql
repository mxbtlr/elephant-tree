-- Comprehensive diagnostic and fix for opportunities INSERT policy
-- This will check current state and fix the issue

-- ============================================
-- STEP 1: DIAGNOSTICS
-- ============================================

-- Check if RLS is enabled
SELECT 
  'RLS Status' as check_type,
  tablename,
  CASE 
    WHEN rowsecurity THEN 'Enabled ✓'
    ELSE 'Disabled ✗'
  END as status
FROM pg_tables 
WHERE tablename = 'opportunities';

-- List ALL existing policies on opportunities
SELECT 
  'Existing Policies' as check_type,
  policyname,
  cmd,
  roles,
  qual,
  with_check,
  CASE 
    WHEN cmd = 'INSERT' AND with_check IS NULL THEN '⚠️ Missing WITH CHECK'
    WHEN cmd = 'INSERT' AND with_check = 'true' THEN '✓ Should work'
    ELSE ''
  END as note
FROM pg_policies 
WHERE tablename = 'opportunities'
ORDER BY cmd, policyname;

-- Check current auth context
SELECT 
  'Auth Context' as check_type,
  auth.role() as current_role,
  auth.uid() as current_user_id,
  CASE 
    WHEN auth.role() = 'authenticated' THEN '✓ Authenticated'
    ELSE '✗ Not authenticated - Run this as your authenticated user!'
  END as auth_status;

-- ============================================
-- STEP 2: FIX - Drop ALL policies
-- ============================================

-- Drop every possible policy name that might exist
DO $$ 
DECLARE
    policy_record RECORD;
BEGIN
    FOR policy_record IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'opportunities'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.opportunities', policy_record.policyname);
        RAISE NOTICE 'Dropped policy: %', policy_record.policyname;
    END LOOP;
END $$;

-- Also drop by specific names (in case DO block doesn't work)
DROP POLICY IF EXISTS "Users can create opportunities in accessible outcomes" ON public.opportunities;
DROP POLICY IF EXISTS "Authenticated users can create opportunities" ON public.opportunities;
DROP POLICY IF EXISTS "Anyone can create opportunities" ON public.opportunities;
DROP POLICY IF EXISTS "Allow authenticated users to insert opportunities" ON public.opportunities;
DROP POLICY IF EXISTS "Users can view opportunities" ON public.opportunities;
DROP POLICY IF EXISTS "Authenticated users can view opportunities" ON public.opportunities;
DROP POLICY IF EXISTS "Users can view opportunities of accessible outcomes" ON public.opportunities;
DROP POLICY IF EXISTS "Users can view opportunities they created" ON public.opportunities;
DROP POLICY IF EXISTS "Users can update opportunities" ON public.opportunities;
DROP POLICY IF EXISTS "Users can update opportunities in accessible outcomes" ON public.opportunities;
DROP POLICY IF EXISTS "Users can delete opportunities" ON public.opportunities;
DROP POLICY IF EXISTS "Users can delete opportunities in accessible outcomes" ON public.opportunities;

-- ============================================
-- STEP 3: Create simple policies
-- ============================================

-- INSERT policy - simplest possible
CREATE POLICY "authenticated_insert_opportunities"
  ON public.opportunities 
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- SELECT policy - allow viewing
CREATE POLICY "authenticated_select_opportunities"
  ON public.opportunities 
  FOR SELECT
  TO authenticated
  USING (true);

-- UPDATE policy
CREATE POLICY "authenticated_update_opportunities"
  ON public.opportunities 
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- DELETE policy
CREATE POLICY "authenticated_delete_opportunities"
  ON public.opportunities 
  FOR DELETE
  TO authenticated
  USING (true);

-- ============================================
-- STEP 4: VERIFY
-- ============================================

-- Show what was created
SELECT 
  'After Fix' as check_type,
  policyname,
  cmd,
  CASE 
    WHEN cmd = 'INSERT' AND with_check = 'true' THEN '✓ Should work'
    WHEN cmd = 'INSERT' THEN '⚠️ Check WITH CHECK: ' || COALESCE(with_check::text, 'NULL')
    ELSE ''
  END as verification
FROM pg_policies 
WHERE tablename = 'opportunities'
ORDER BY cmd, policyname;

-- Count policies by command
SELECT 
  'Policy Count' as check_type,
  cmd,
  COUNT(*) as count
FROM pg_policies 
WHERE tablename = 'opportunities'
GROUP BY cmd
ORDER BY cmd;

-- Test insert capability (this should work now)
-- Uncomment to test:
/*
DO $$
DECLARE
    test_outcome_id UUID;
    test_opp_id UUID;
BEGIN
    -- Get first outcome
    SELECT id INTO test_outcome_id FROM public.outcomes LIMIT 1;
    
    IF test_outcome_id IS NOT NULL THEN
        -- Try to insert
        INSERT INTO public.opportunities (title, outcome_id, owner)
        VALUES ('Test Opportunity', test_outcome_id, auth.uid())
        RETURNING id INTO test_opp_id;
        
        -- Clean up
        DELETE FROM public.opportunities WHERE id = test_opp_id;
        
        RAISE NOTICE '✓ Test insert succeeded! Policy is working.';
    ELSE
        RAISE NOTICE '⚠️ No outcomes found to test with.';
    END IF;
END $$;
*/
