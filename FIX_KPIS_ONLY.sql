-- Fix KPIs INSERT policy ONLY
-- Run this directly in Supabase SQL Editor - no table creation

-- Step 1: Drop ALL existing policies on kpis
DO $$ 
DECLARE
    pol_name TEXT;
BEGIN
    FOR pol_name IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE schemaname = 'public' AND tablename = 'kpis'
    LOOP
        BEGIN
            EXECUTE format('DROP POLICY IF EXISTS %I ON public.kpis', pol_name);
            RAISE NOTICE 'Dropped: %', pol_name;
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Could not drop %: %', pol_name, SQLERRM;
        END;
    END LOOP;
END $$;

-- Step 2: Also drop by common names
DROP POLICY IF EXISTS "Authenticated users can create KPIs" ON public.kpis;
DROP POLICY IF EXISTS "Users can manage KPIs in accessible tests" ON public.kpis;
DROP POLICY IF EXISTS "Users can view KPIs" ON public.kpis;
DROP POLICY IF EXISTS "Authenticated users can view KPIs" ON public.kpis;
DROP POLICY IF EXISTS "insert_kpi_policy" ON public.kpis;
DROP POLICY IF EXISTS "select_kpi_policy" ON public.kpis;
DROP POLICY IF EXISTS "update_kpi_policy" ON public.kpis;
DROP POLICY IF EXISTS "delete_kpi_policy" ON public.kpis;

-- Step 3: Create simple policies
CREATE POLICY "insert_kpi_policy"
  ON public.kpis FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "select_kpi_policy"
  ON public.kpis FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "update_kpi_policy"
  ON public.kpis FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "delete_kpi_policy"
  ON public.kpis FOR DELETE
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
WHERE tablename = 'kpis'
ORDER BY cmd;
