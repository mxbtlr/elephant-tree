# Fix Missing Outcomes Issue

## Problem
After logging in, all earlier outcomes are missing/not visible.

## Root Cause
The RLS (Row Level Security) policies are missing SELECT policies for outcomes, or they're too restrictive. This means even though the data exists in the database, users can't see it due to security policies blocking access.

## Solution

Run this SQL migration in your Supabase SQL Editor:

```sql
-- Fix missing SELECT policies for outcomes
-- This allows users to view existing outcomes

-- Drop existing SELECT policies
DROP POLICY IF EXISTS "Users can view outcomes they have access to" ON public.outcomes;
DROP POLICY IF EXISTS "Users can view outcomes" ON public.outcomes;
DROP POLICY IF EXISTS "Authenticated users can view outcomes" ON public.outcomes;

-- Create a permissive SELECT policy that allows all authenticated users to see outcomes
CREATE POLICY "Authenticated users can view outcomes"
  ON public.outcomes FOR SELECT
  TO authenticated
  USING (
    auth.role() = 'authenticated' AND
    (
      -- Public outcomes visible to all
      visibility = 'public' OR
      -- Private outcomes visible to owner
      (visibility = 'private' AND owner = auth.uid()) OR
      -- Team outcomes visible to team members or owner
      (visibility = 'team' AND (
        team_id IS NULL OR
        owner = auth.uid() OR
        EXISTS (
          SELECT 1 FROM public.team_memberships tm
          WHERE tm.team_id = outcomes.team_id
          AND tm.user_id = auth.uid()
        )
      )) OR
      -- Admins see everything
      EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role = 'admin'
      ) OR
      -- Fallback: if visibility is NULL or not set, allow authenticated users to see it
      -- This handles old data that might not have visibility set
      visibility IS NULL OR
      -- Also allow if user is the owner (regardless of visibility)
      owner = auth.uid()
    )
  );
```

Or run the complete migration file:
```bash
# From your Supabase instance
psql -h your-host -U postgres -d postgres -f supabase/migrations/014_fix_outcomes_select_policy.sql
```

## Quick Fix (More Permissive - For Development)

If you need a quick fix that allows all authenticated users to see all outcomes:

```sql
-- Very permissive policy (development only)
DROP POLICY IF EXISTS "Authenticated users can view outcomes" ON public.outcomes;
CREATE POLICY "Authenticated users can view outcomes"
  ON public.outcomes FOR SELECT
  TO authenticated
  USING (auth.role() = 'authenticated');
```

⚠️ **Warning**: This allows all authenticated users to see ALL outcomes, regardless of ownership or visibility. Only use for development/testing.

## Verify the Fix

After running the migration:

1. **Check that policies exist**:
   ```sql
   SELECT 
     schemaname, 
     tablename, 
     policyname, 
     cmd
   FROM pg_policies
   WHERE tablename = 'outcomes'
     AND cmd = 'SELECT';
   ```

2. **Test query as your user**:
   ```sql
   -- This should return outcomes (replace with your user ID)
   SELECT id, title, visibility, owner 
   FROM public.outcomes 
   LIMIT 10;
   ```

3. **Refresh your app** - outcomes should now be visible

## If Outcomes Are Still Missing

1. **Check if outcomes exist in the database**:
   ```sql
   SELECT COUNT(*) FROM public.outcomes;
   ```

2. **Check your user ID**:
   ```sql
   SELECT auth.uid(), auth.role();
   ```

3. **Check if you're the owner of any outcomes**:
   ```sql
   SELECT COUNT(*) FROM public.outcomes WHERE owner = auth.uid();
   ```

4. **Check outcome visibility**:
   ```sql
   SELECT visibility, COUNT(*) 
   FROM public.outcomes 
   GROUP BY visibility;
   ```

5. **Check if you're an admin**:
   ```sql
   SELECT role FROM public.profiles WHERE id = auth.uid();
   ```

## Make Yourself Admin (If Needed)

If you need to see all outcomes, make yourself admin:

```sql
UPDATE public.profiles
SET role = 'admin'
WHERE email = 'your-email@example.com';
```

Then refresh the app and you should see all outcomes.
