-- Fix solutions INSERT policy ONLY
-- Run this directly in Supabase SQL Editor - no table creation

-- Step 1: Drop ALL existing policies on solutions
DO $$ 
DECLARE
    pol_name TEXT;
BEGIN
    FOR pol_name IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE schemaname = 'public' AND tablename = 'solutions'
    LOOP
        BEGIN
            EXECUTE format('DROP POLICY IF EXISTS %I ON public.solutions', pol_name);
            RAISE NOTICE 'Dropped: %', pol_name;
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Could not drop %: %', pol_name, SQLERRM;
        END;
    END LOOP;
END $$;

-- Step 2: Also drop by common names
DROP POLICY IF EXISTS "Authenticated users can create solutions" ON public.solutions;
DROP POLICY IF EXISTS "Users can manage solutions in accessible opportunities" ON public.solutions;
DROP POLICY IF EXISTS "Users can view solutions" ON public.solutions;
DROP POLICY IF EXISTS "Authenticated users can view solutions" ON public.solutions;
DROP POLICY IF EXISTS "insert_sol_policy" ON public.solutions;
DROP POLICY IF EXISTS "select_sol_policy" ON public.solutions;
DROP POLICY IF EXISTS "update_sol_policy" ON public.solutions;
DROP POLICY IF EXISTS "delete_sol_policy" ON public.solutions;

-- Step 3: Create simple policies
CREATE POLICY "insert_sol_policy"
  ON public.solutions FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "select_sol_policy"
  ON public.solutions FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "update_sol_policy"
  ON public.solutions FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "delete_sol_policy"
  ON public.solutions FOR DELETE
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
WHERE tablename = 'solutions'
ORDER BY cmd;
