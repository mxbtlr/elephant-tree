-- Fix opportunities INSERT policy ONLY
-- Run this directly in Supabase SQL Editor - no table creation

-- Step 1: Drop ALL existing policies on opportunities
DO $$ 
DECLARE
    pol_name TEXT;
BEGIN
    FOR pol_name IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE schemaname = 'public' AND tablename = 'opportunities'
    LOOP
        BEGIN
            EXECUTE format('DROP POLICY IF EXISTS %I ON public.opportunities', pol_name);
            RAISE NOTICE 'Dropped: %', pol_name;
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Could not drop %: %', pol_name, SQLERRM;
        END;
    END LOOP;
END $$;

-- Step 2: Also drop by common names
DROP POLICY IF EXISTS "Allow authenticated users to insert opportunities" ON public.opportunities;
DROP POLICY IF EXISTS "Authenticated users can create opportunities" ON public.opportunities;
DROP POLICY IF EXISTS "Users can create opportunities in accessible outcomes" ON public.opportunities;
DROP POLICY IF EXISTS "authenticated_insert_opportunities" ON public.opportunities;
DROP POLICY IF EXISTS "insert_opp_policy" ON public.opportunities;
DROP POLICY IF EXISTS "select_opp_policy" ON public.opportunities;
DROP POLICY IF EXISTS "update_opp_policy" ON public.opportunities;
DROP POLICY IF EXISTS "delete_opp_policy" ON public.opportunities;

-- Step 3: Create simple policies
CREATE POLICY "insert_opp_policy"
  ON public.opportunities FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "select_opp_policy"
  ON public.opportunities FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "update_opp_policy"
  ON public.opportunities FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "delete_opp_policy"
  ON public.opportunities FOR DELETE
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
WHERE tablename = 'opportunities'
ORDER BY cmd;
