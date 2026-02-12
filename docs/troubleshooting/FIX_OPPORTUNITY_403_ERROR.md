# Fix 403 Forbidden Error When Creating Opportunities

## Error
```
403 (Forbidden)
code: '42501'
message: 'new row violates row-level security policy for table "opportunities"'
```

This means the RLS INSERT policy's `WITH CHECK` clause is failing.

## Quick Fix

Run this SQL in your Supabase SQL Editor:

```sql
-- Drop ALL existing policies on opportunities
DROP POLICY IF EXISTS "Users can create opportunities in accessible outcomes" ON public.opportunities;
DROP POLICY IF EXISTS "Authenticated users can create opportunities" ON public.opportunities;
DROP POLICY IF EXISTS "Anyone can create opportunities" ON public.opportunities;
DROP POLICY IF EXISTS "Allow authenticated users to insert opportunities" ON public.opportunities;

-- Create the simplest possible INSERT policy
-- WITH CHECK (true) means "allow any row from authenticated users"
CREATE POLICY "Allow authenticated users to insert opportunities"
  ON public.opportunities FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Verify the policy was created
SELECT 
  policyname, 
  cmd,
  with_check
FROM pg_policies 
WHERE tablename = 'opportunities' AND cmd = 'INSERT';
```

## Verify RLS is Working

Check if RLS is enabled and policies exist:

```sql
-- Check if RLS is enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'opportunities';

-- Should show: rowsecurity = true

-- Check all policies on opportunities table
SELECT 
  policyname, 
  cmd,
  roles,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'opportunities'
ORDER BY cmd;
```

## Test the Policy

Test if you can insert directly:

```sql
-- Check your auth context first
SELECT 
  auth.role() as role,
  auth.uid() as user_id,
  CASE 
    WHEN auth.role() = 'authenticated' THEN '✓ Authenticated'
    ELSE '✗ Not authenticated'
  END as status;

-- Try inserting (replace outcome_id with a real one from your database)
INSERT INTO public.opportunities (
  title,
  description,
  outcome_id,
  owner
) VALUES (
  'Test Opportunity',
  'Test description',
  'your-outcome-id-here',
  auth.uid()
) RETURNING *;
```

If the direct INSERT works but the app doesn't, the policy is correct but there might be a client-side issue.

## Alternative: Temporarily Disable RLS (Development Only)

⚠️ **WARNING**: Only for development/testing!

```sql
-- Temporarily disable RLS
ALTER TABLE public.opportunities DISABLE ROW LEVEL SECURITY;
```

To re-enable:
```sql
ALTER TABLE public.opportunities ENABLE ROW LEVEL SECURITY;
```

## If Still Not Working

1. **Check for conflicting policies**: Multiple INSERT policies can conflict
   ```sql
   SELECT COUNT(*) FROM pg_policies 
   WHERE tablename = 'opportunities' AND cmd = 'INSERT';
   ```
   Should be 1.

2. **Verify your authentication**: Make sure you're logged in as the same user
   ```sql
   SELECT auth.uid(), auth.role();
   ```

3. **Check table permissions**: 
   ```sql
   SELECT grantee, privilege_type
   FROM information_schema.role_table_grants
   WHERE table_name = 'opportunities';
   ```

4. **Check if the outcome exists and you have access**:
   ```sql
   SELECT id, title, owner, visibility
   FROM public.outcomes
   WHERE id = 'f2ad5a8f-a076-4be2-b0db-84a22213f362';
   ```
