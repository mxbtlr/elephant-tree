# Quick RLS Fix - Run This First

The helper functions are missing. Run this SQL in your Supabase SQL Editor:

## Step 1: Create Helper Functions

```sql
-- Create helper functions
CREATE OR REPLACE FUNCTION public.is_admin(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = user_id AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.is_team_member(user_id UUID, team_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.team_memberships
    WHERE user_id = is_team_member.user_id AND team_id = is_team_member.team_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.get_team_role(user_id UUID, team_id UUID)
RETURNS TEXT AS $$
BEGIN
  RETURN (
    SELECT role FROM public.team_memberships
    WHERE user_id = get_team_role.user_id AND team_id = get_team_role.team_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

## Step 2: Fix INSERT Policies (Simple Version)

After creating the functions, run this to fix the INSERT policies:

```sql
-- Fix outcomes INSERT policy
DROP POLICY IF EXISTS "Authenticated users can create outcomes" ON public.outcomes;
CREATE POLICY "Authenticated users can create outcomes"
  ON public.outcomes FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');
```

## OR: Use Simple Policies (No Helper Functions)

If you want to avoid helper functions entirely, run:

```sql
-- Run the simple policies migration
-- Copy and paste contents of: supabase/migrations/007_simple_rls_policies.sql
```

This creates very permissive policies that allow any authenticated user to create/update/delete their own data.

## Verify Functions Exist

After running Step 1, verify:

```sql
SELECT proname FROM pg_proc 
WHERE proname IN ('is_admin', 'is_team_member', 'get_team_role');
```

You should see all three functions listed.

## Then Run the Fix

After creating the functions, you can run `005_fix_rls_policies.sql` which now includes the function creation at the top.

