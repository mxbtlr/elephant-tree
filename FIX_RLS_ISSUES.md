# Fix RLS (Row Level Security) Issues

If RLS policies are preventing you from creating outcomes or other entities, run this fix.

## Quick Fix

Run this SQL in your Supabase SQL Editor (`http://87.106.6.59:8000` → SQL Editor):

```sql
-- Fix RLS policies for self-hosted Supabase
-- Drop and recreate INSERT policies to be more permissive

-- Outcomes
DROP POLICY IF EXISTS "Authenticated users can create outcomes" ON public.outcomes;
CREATE POLICY "Authenticated users can create outcomes"
  ON public.outcomes FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- Opportunities  
DROP POLICY IF EXISTS "Users can create opportunities in accessible outcomes" ON public.opportunities;
CREATE POLICY "Users can create opportunities in accessible outcomes"
  ON public.opportunities FOR INSERT
  WITH CHECK (
    auth.role() = 'authenticated' AND
    EXISTS (
      SELECT 1 FROM public.outcomes
      WHERE id = opportunities.outcome_id
    )
  );

-- Solutions
DROP POLICY IF EXISTS "Users can manage solutions in accessible opportunities" ON public.solutions;
CREATE POLICY "Users can create solutions in accessible opportunities"
  ON public.solutions FOR INSERT
  WITH CHECK (
    auth.role() = 'authenticated' AND
    EXISTS (
      SELECT 1 FROM public.opportunities opp
      JOIN public.outcomes o ON o.id = opp.outcome_id
      WHERE opp.id = solutions.opportunity_id
    )
  );

-- Tests
DROP POLICY IF EXISTS "Users can manage tests in accessible solutions" ON public.tests;
CREATE POLICY "Users can create tests in accessible solutions"
  ON public.tests FOR INSERT
  WITH CHECK (
    auth.role() = 'authenticated' AND
    EXISTS (
      SELECT 1 FROM public.solutions sol
      JOIN public.opportunities opp ON opp.id = sol.opportunity_id
      JOIN public.outcomes o ON o.id = opp.outcome_id
      WHERE sol.id = tests.solution_id
    )
  );

-- KPIs
DROP POLICY IF EXISTS "Users can manage KPIs in accessible tests" ON public.kpis;
CREATE POLICY "Users can create KPIs in accessible tests"
  ON public.kpis FOR INSERT
  WITH CHECK (
    auth.role() = 'authenticated' AND
    EXISTS (
      SELECT 1 FROM public.tests t
      JOIN public.solutions sol ON sol.id = t.solution_id
      JOIN public.opportunities opp ON opp.id = sol.opportunity_id
      JOIN public.outcomes o ON o.id = opp.outcome_id
      WHERE t.id = kpis.test_id
    )
  );
```

Or run the migration file: `supabase/migrations/005_fix_rls_policies.sql`

## Alternative: Temporarily Disable RLS (Development Only)

⚠️ **WARNING**: Only use this for development/testing, NOT for production!

```sql
-- Temporarily disable RLS on outcomes (for testing)
ALTER TABLE public.outcomes DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.opportunities DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.solutions DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.tests DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.kpis DISABLE ROW LEVEL SECURITY;
```

To re-enable:
```sql
ALTER TABLE public.outcomes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.opportunities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.solutions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kpis ENABLE ROW LEVEL SECURITY;
```

## Verify Policies

Check if policies exist:
```sql
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE tablename IN ('outcomes', 'opportunities', 'solutions', 'tests', 'kpis')
ORDER BY tablename, policyname;
```

## Test After Fix

1. Try creating an outcome
2. Check browser console for any errors
3. If still failing, check Supabase logs for RLS policy violations

## Common Issues

### Issue: `auth.uid()` returns NULL
**Solution**: Use `auth.role() = 'authenticated'` instead in policies

### Issue: Policies too restrictive
**Solution**: Use the migration file `005_fix_rls_policies.sql` which has more permissive policies

### Issue: Helper functions not working
**Solution**: Make sure migration `002_row_level_security.sql` ran successfully and helper functions exist:
```sql
SELECT proname FROM pg_proc WHERE proname IN ('is_admin', 'is_team_member', 'get_team_role');
```

