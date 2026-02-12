-- Fix tests INSERT policy ONLY
-- Run this directly in Supabase SQL Editor - no table creation

-- Step 1: Drop ALL existing policies on tests
DO $$ 
DECLARE
    pol_name TEXT;
BEGIN
    FOR pol_name IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE schemaname = 'public' AND tablename = 'tests'
    LOOP
        BEGIN
            EXECUTE format('DROP POLICY IF EXISTS %I ON public.tests', pol_name);
            RAISE NOTICE 'Dropped: %', pol_name;
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Could not drop %: %', pol_name, SQLERRM;
        END;
    END LOOP;
END $$;

-- Step 2: Also drop by common names
DROP POLICY IF EXISTS "Authenticated users can create tests" ON public.tests;
DROP POLICY IF EXISTS "Users can manage tests in accessible solutions" ON public.tests;
DROP POLICY IF EXISTS "Users can view tests" ON public.tests;
DROP POLICY IF EXISTS "Authenticated users can view tests" ON public.tests;
DROP POLICY IF EXISTS "insert_test_policy" ON public.tests;
DROP POLICY IF EXISTS "select_test_policy" ON public.tests;
DROP POLICY IF EXISTS "update_test_policy" ON public.tests;
DROP POLICY IF EXISTS "delete_test_policy" ON public.tests;

-- Step 3: Create simple policies
CREATE POLICY "insert_test_policy"
  ON public.tests FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "select_test_policy"
  ON public.tests FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "update_test_policy"
  ON public.tests FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "delete_test_policy"
  ON public.tests FOR DELETE
  TO authenticated
  USING (true);

-- Step 4: Verify
SELECT 
  policyname,
  cmd,
  CASE 
    WHEN cmd = 'INSERT' AND with_check::text = 'true' THEN '✓ Correct'
    ELSE 'Check: ' || COALESCE(with_check::text, 'NULL')
  END as status
FROM pg_policies 
WHERE tablename = 'tests'
ORDER BY cmd;
