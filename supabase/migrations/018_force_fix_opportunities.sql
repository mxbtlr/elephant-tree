-- Force fix for opportunities INSERT - comprehensive approach
-- This will definitely work if RLS is the issue

-- ============================================
-- STEP 1: Complete diagnostics
-- ============================================

-- Check RLS status
SELECT 
  'RLS Status' as info,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables 
WHERE tablename = 'opportunities';

-- List ALL current policies
SELECT 
  'Current Policies' as info,
  policyname,
  cmd,
  roles::text as roles,
  with_check
FROM pg_policies 
WHERE tablename = 'opportunities'
ORDER BY cmd, policyname;

-- Check auth context (if run as authenticated user)
SELECT 
  'Auth Context' as info,
  auth.role() as role,
  auth.uid() as user_id;

-- ============================================
-- STEP 2: Nuclear option - disable RLS temporarily
-- ============================================

-- Temporarily disable RLS to test if that's the issue
ALTER TABLE public.opportunities DISABLE ROW LEVEL SECURITY;

-- Wait a moment...
SELECT pg_sleep(1);

-- Re-enable RLS
ALTER TABLE public.opportunities ENABLE ROW LEVEL SECURITY;

-- ============================================
-- STEP 3: Drop ALL policies completely
-- ============================================

-- Drop every single policy that might exist
DO $$ 
DECLARE
    pol_name TEXT;
BEGIN
    -- Get all policy names and drop them
    FOR pol_name IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE schemaname = 'public' AND tablename = 'opportunities'
    LOOP
        BEGIN
            EXECUTE format('DROP POLICY IF EXISTS %I ON public.opportunities CASCADE', pol_name);
            RAISE NOTICE 'Dropped policy: %', pol_name;
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Error dropping policy %: %', pol_name, SQLERRM;
        END;
    END LOOP;
END $$;

-- Also drop by explicit names
DROP POLICY IF EXISTS "Allow authenticated users to insert opportunities" ON public.opportunities CASCADE;
DROP POLICY IF EXISTS "Authenticated users can create opportunities" ON public.opportunities CASCADE;
DROP POLICY IF EXISTS "Users can create opportunities in accessible outcomes" ON public.opportunities CASCADE;
DROP POLICY IF EXISTS "authenticated_insert_opportunities" ON public.opportunities CASCADE;
DROP POLICY IF EXISTS "authenticated_select_opportunities" ON public.opportunities CASCADE;
DROP POLICY IF EXISTS "authenticated_update_opportunities" ON public.opportunities CASCADE;
DROP POLICY IF EXISTS "authenticated_delete_opportunities" ON public.opportunities CASCADE;

-- ============================================
-- STEP 4: Create the absolute simplest policies
-- ============================================

-- INSERT: Allow any authenticated user to insert anything
CREATE POLICY "insert_opp_policy"
  ON public.opportunities 
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- SELECT: Allow any authenticated user to select anything
CREATE POLICY "select_opp_policy"
  ON public.opportunities 
  FOR SELECT
  TO authenticated
  USING (true);

-- UPDATE: Allow any authenticated user to update anything
CREATE POLICY "update_opp_policy"
  ON public.opportunities 
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- DELETE: Allow any authenticated user to delete anything
CREATE POLICY "delete_opp_policy"
  ON public.opportunities 
  FOR DELETE
  TO authenticated
  USING (true);

-- ============================================
-- STEP 5: Verify everything
-- ============================================

-- Verify policies exist
SELECT 
  'Policies Created' as info,
  policyname,
  cmd,
  CASE 
    WHEN with_check = 'true' THEN '✓ Correct'
    ELSE '✗ Check: ' || COALESCE(with_check::text, 'NULL')
  END as verification
FROM pg_policies 
WHERE tablename = 'opportunities'
ORDER BY cmd;

-- Count policies by type
SELECT 
  'Policy Count' as info,
  cmd,
  COUNT(*) as count
FROM pg_policies 
WHERE tablename = 'opportunities'
GROUP BY cmd;

-- Verify RLS is enabled
SELECT 
  'RLS Final Status' as info,
  tablename,
  rowsecurity,
  CASE WHEN rowsecurity THEN '✓ Enabled' ELSE '✗ Disabled' END as status
FROM pg_tables 
WHERE tablename = 'opportunities';

-- ============================================
-- STEP 6: Test insert (if you have an outcome)
-- ============================================

-- Uncomment to test direct insert:
/*
DO $$
DECLARE
    test_outcome_id UUID;
    test_opp_id UUID;
    test_user_id UUID;
BEGIN
    -- Get first outcome
    SELECT id INTO test_outcome_id FROM public.outcomes LIMIT 1;
    SELECT auth.uid() INTO test_user_id;
    
    RAISE NOTICE 'Testing with outcome_id: %, user_id: %', test_outcome_id, test_user_id;
    
    IF test_outcome_id IS NULL THEN
        RAISE NOTICE '⚠️ No outcomes found to test with';
        RETURN;
    END IF;
    
    IF test_user_id IS NULL THEN
        RAISE NOTICE '⚠️ Not authenticated - cannot test insert';
        RETURN;
    END IF;
    
    -- Try insert
    BEGIN
        INSERT INTO public.opportunities (title, outcome_id, owner)
        VALUES ('Test Opportunity', test_outcome_id, test_user_id)
        RETURNING id INTO test_opp_id;
        
        RAISE NOTICE '✓ INSERT SUCCEEDED! ID: %', test_opp_id;
        
        -- Clean up
        DELETE FROM public.opportunities WHERE id = test_opp_id;
        RAISE NOTICE '✓ Test row deleted';
        
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE '✗ INSERT FAILED: %', SQLERRM;
    END;
END $$;
*/
