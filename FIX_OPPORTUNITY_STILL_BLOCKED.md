# Fix: Opportunities Still Blocked After Policy Update

## Problem
Still getting 403 Forbidden (42501) even after creating the policy. This means:
1. The policy might not have been applied correctly
2. Multiple policies are conflicting
3. The policy syntax is incorrect

## Complete Fix

Run this SQL to diagnose and fix everything:

```sql
-- Step 1: See what policies currently exist
SELECT policyname, cmd, with_check
FROM pg_policies 
WHERE tablename = 'opportunities';

-- Step 2: Drop ALL policies using a script
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
    END LOOP;
END $$;

-- Step 3: Also drop by name (backup method)
DROP POLICY IF EXISTS "Allow authenticated users to insert opportunities" ON public.opportunities;
DROP POLICY IF EXISTS "Authenticated users can create opportunities" ON public.opportunities;
DROP POLICY IF EXISTS "Users can create opportunities in accessible outcomes" ON public.opportunities;

-- Step 4: Create new simple policy with unique name
CREATE POLICY "authenticated_insert_opportunities"
  ON public.opportunities 
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Step 5: Verify it was created
SELECT policyname, cmd, with_check
FROM pg_policies 
WHERE tablename = 'opportunities' AND cmd = 'INSERT';
```

## Or Use the Migration File

Run the complete migration:
```bash
# In Supabase SQL Editor, copy/paste the contents of:
supabase/migrations/017_diagnose_and_fix_opportunities.sql
```

## Common Issues

### Issue 1: Multiple INSERT Policies
If you have multiple INSERT policies, they might conflict. Only ONE INSERT policy should exist.

```sql
-- Check how many INSERT policies exist
SELECT COUNT(*) 
FROM pg_policies 
WHERE tablename = 'opportunities' AND cmd = 'INSERT';

-- Should be 1. If more, drop all and recreate one.
```

### Issue 2: Policy Not Applied
After creating the policy, verify it exists:

```sql
SELECT * FROM pg_policies 
WHERE tablename = 'opportunities' AND cmd = 'INSERT';
```

If nothing returns, the policy wasn't created.

### Issue 3: Wrong Role
Make sure the policy is for `authenticated` role:

```sql
-- Check the policy roles
SELECT policyname, cmd, roles
FROM pg_policies 
WHERE tablename = 'opportunities' AND cmd = 'INSERT';
```

Should show `{authenticated}` or `authenticated`.

### Issue 4: WITH CHECK Clause
The `WITH CHECK` must be `true` (not a condition):

```sql
-- Check WITH CHECK clause
SELECT policyname, with_check
FROM pg_policies 
WHERE tablename = 'opportunities' AND cmd = 'INSERT';
```

Should show `true`, not a condition like `auth.role() = 'authenticated'`.

## Nuclear Option: Disable RLS Temporarily

If nothing works, temporarily disable RLS (development only):

```sql
-- Disable RLS
ALTER TABLE public.opportunities DISABLE ROW LEVEL SECURITY;

-- Test if insert works now
-- If yes, the issue is definitely with policies

-- Re-enable RLS
ALTER TABLE public.opportunities ENABLE ROW LEVEL SECURITY;

-- Then recreate the simple policy
CREATE POLICY "authenticated_insert_opportunities"
  ON public.opportunities 
  FOR INSERT
  TO authenticated
  WITH CHECK (true);
```

## Test Direct Insert

After applying the fix, test if you can insert directly:

```sql
-- Get a real outcome ID
SELECT id FROM public.outcomes LIMIT 1;

-- Try inserting (replace with real outcome_id)
INSERT INTO public.opportunities (
  title,
  outcome_id,
  owner
) VALUES (
  'Test Direct Insert',
  'your-outcome-id-here',
  auth.uid()
) RETURNING *;

-- If this works, delete the test row
DELETE FROM public.opportunities WHERE title = 'Test Direct Insert';
```

If direct insert works but the app doesn't, check the browser console for additional errors.
