# Fix "Failed to Create Opportunity" Error

## Problem
Getting "Failed to create opportunity" error when trying to create an opportunity.

## Common Causes

1. **RLS Policy Issues**: Row Level Security policies are blocking the INSERT
2. **Foreign Key Constraint**: The outcome_id doesn't exist or you don't have access to it
3. **Missing Permissions**: Your user doesn't have INSERT permission on the opportunities table

## Quick Fix

### Step 1: Run the Complete Migration (Recommended)

Run the complete migration file which fixes both INSERT and SELECT policies:

```bash
# From your Supabase instance
psql -h your-host -U postgres -d postgres -f supabase/migrations/015_fix_opportunities_complete.sql
```

Or copy and run the SQL from `supabase/migrations/015_fix_opportunities_complete.sql` in your Supabase SQL Editor.

### Alternative: Manual Fix

If you prefer to run SQL manually, here's what to run:

```sql
-- Drop all existing INSERT policies on opportunities
DROP POLICY IF EXISTS "Users can create opportunities in accessible outcomes" ON public.opportunities;
DROP POLICY IF EXISTS "Authenticated users can create opportunities" ON public.opportunities;
DROP POLICY IF EXISTS "Anyone can create opportunities" ON public.opportunities;

-- Create the simplest possible policy that just checks authentication
CREATE POLICY "Authenticated users can create opportunities"
  ON public.opportunities FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.role() = 'authenticated'
  );

-- Ensure SELECT policy allows users to see opportunities they created
DROP POLICY IF EXISTS "Users can view opportunities of accessible outcomes" ON public.opportunities;
DROP POLICY IF EXISTS "Authenticated users can view opportunities" ON public.opportunities;

CREATE POLICY "Users can view opportunities they created"
  ON public.opportunities FOR SELECT
  TO authenticated
  USING (
    auth.role() = 'authenticated' AND
    (
      owner = auth.uid() OR
      EXISTS (
        SELECT 1 FROM public.outcomes o
        WHERE o.id = opportunities.outcome_id
        AND (
          o.owner = auth.uid() OR
          o.visibility = 'public' OR
          (
            o.visibility = 'team' AND
            EXISTS (
              SELECT 1 FROM public.team_memberships tm
              WHERE tm.team_id = o.team_id
              AND tm.user_id = auth.uid()
            )
          )
        )
      )
    )
  );
```

Or run the migration file:
```bash
# From your Supabase instance
psql -h your-host -U postgres -d postgres -f supabase/migrations/013_fix_opportunities_insert_final.sql
```

### Step 2: Verify the Policies

Check that the policies were created:

```sql
SELECT 
  schemaname, 
  tablename, 
  policyname, 
  cmd,
  with_check
FROM pg_policies
WHERE tablename = 'opportunities'
ORDER BY policyname;
```

You should see:
- `Authenticated users can create opportunities` with `cmd = 'INSERT'`
- `Users can view opportunities they created` with `cmd = 'SELECT'`

### Step 3: Check Your Authentication

Make sure you're authenticated:

```sql
-- Check current user
SELECT auth.uid(), auth.role();

-- Should return:
-- auth.uid() - your user ID (UUID)
-- auth.role() - 'authenticated'
```

If `auth.uid()` returns NULL, you're not authenticated properly.

## Debug Steps

### 1. Check Browser Console

Open browser console (F12) and look for:
- Error codes (e.g., `42501` = permission denied, `23503` = foreign key violation)
- Detailed error messages
- The exact error from Supabase

### 2. Check Outcome Access

Verify you can access the outcome you're trying to add an opportunity to:

```sql
-- Replace 'outcome-id-here' with your actual outcome ID
SELECT id, title, owner, visibility, team_id
FROM public.outcomes
WHERE id = 'outcome-id-here';
```

If this returns no rows, you don't have access to the outcome.

### 3. Test Direct Insert

Try inserting directly via SQL (replace values):

```sql
INSERT INTO public.opportunities (
  title,
  description,
  outcome_id,
  owner,
  start_date,
  end_date
) VALUES (
  'Test Opportunity',
  'Test description',
  'your-outcome-id-here',
  auth.uid(),
  NULL,
  NULL
) RETURNING *;
```

If this works but the app doesn't, it's likely a client-side issue.
If this fails, check the error message.

## Alternative: Temporarily Disable RLS (Development Only)

⚠️ **WARNING**: Only for development/testing!

```sql
-- Temporarily disable RLS on opportunities
ALTER TABLE public.opportunities DISABLE ROW LEVEL SECURITY;
```

To re-enable:
```sql
ALTER TABLE public.opportunities ENABLE ROW LEVEL SECURITY;
```

## Error Code Reference

- **42501**: Permission denied (RLS policy blocking)
- **23503**: Foreign key violation (outcome_id doesn't exist)
- **23505**: Unique constraint violation (duplicate entry)
- **PGRST301**: Permission denied (PostgREST error code)

## Still Not Working?

1. **Check Supabase logs** for detailed error messages
2. **Verify your user profile exists** in the `profiles` table
3. **Check if RLS is enabled** on the opportunities table:
   ```sql
   SELECT tablename, rowsecurity 
   FROM pg_tables 
   WHERE tablename = 'opportunities';
   ```
4. **Try creating an outcome first** to verify basic INSERT works
