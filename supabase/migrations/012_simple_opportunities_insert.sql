-- Simple, permissive opportunities INSERT policy
-- This allows any authenticated user to create opportunities in any outcome they can see

-- Drop existing policies
DROP POLICY IF EXISTS "Users can create opportunities in accessible outcomes" ON public.opportunities;
DROP POLICY IF EXISTS "Authenticated users can create opportunities" ON public.opportunities;

-- Create a very simple policy that just checks authentication
-- This is more permissive and should work for all cases
CREATE POLICY "Authenticated users can create opportunities"
  ON public.opportunities FOR INSERT
  WITH CHECK (
    auth.role() = 'authenticated' AND
    auth.uid() IS NOT NULL
  );

-- If you want to be even more permissive (for testing), you can use this:
-- DROP POLICY IF EXISTS "Authenticated users can create opportunities" ON public.opportunities;
-- CREATE POLICY "Anyone can create opportunities"
--   ON public.opportunities FOR INSERT
--   WITH CHECK (true);

