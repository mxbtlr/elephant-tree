-- Simple RLS policies that don't require helper functions
-- Use this if helper functions are causing issues

-- Drop existing policies
DROP POLICY IF EXISTS "Authenticated users can create outcomes" ON public.outcomes;
DROP POLICY IF EXISTS "Users can create opportunities in accessible outcomes" ON public.opportunities;
DROP POLICY IF EXISTS "Users can manage solutions in accessible opportunities" ON public.solutions;
DROP POLICY IF EXISTS "Users can manage tests in accessible solutions" ON public.tests;
DROP POLICY IF EXISTS "Users can manage KPIs in accessible tests" ON public.kpis;

-- Simple INSERT policies (no helper functions needed)
CREATE POLICY "Authenticated users can create outcomes"
  ON public.outcomes FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can create opportunities"
  ON public.opportunities FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can create solutions"
  ON public.solutions FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can create tests"
  ON public.tests FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can create KPIs"
  ON public.kpis FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- Simple UPDATE policies
DROP POLICY IF EXISTS "Users can update outcomes they own or have team access" ON public.outcomes;
CREATE POLICY "Users can update outcomes"
  ON public.outcomes FOR UPDATE
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Users can update opportunities in accessible outcomes" ON public.opportunities;
CREATE POLICY "Users can update opportunities"
  ON public.opportunities FOR UPDATE
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Users can update solutions in accessible opportunities" ON public.solutions;
CREATE POLICY "Users can update solutions"
  ON public.solutions FOR UPDATE
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Users can update tests in accessible solutions" ON public.tests;
CREATE POLICY "Users can update tests"
  ON public.tests FOR UPDATE
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Users can update KPIs in accessible tests" ON public.kpis;
CREATE POLICY "Users can update KPIs"
  ON public.kpis FOR UPDATE
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

