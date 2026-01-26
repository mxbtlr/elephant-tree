-- Disable email confirmation for self-hosted instances
-- This allows users to sign up and login immediately without email verification

-- Update auth configuration to disable email confirmations
-- Note: This might need to be done via environment variables or config files
-- depending on your Supabase setup

-- For self-hosted Supabase, you typically configure this via:
-- 1. Environment variables: ENABLE_EMAIL_CONFIRMATIONS=false
-- 2. Or via Kong/API Gateway configuration
-- 3. Or via Supabase config files

-- If you can access the auth schema directly, you can try:
-- UPDATE auth.config SET enable_email_confirmations = false;

-- Alternative: Create a function to auto-confirm users on signup
CREATE OR REPLACE FUNCTION public.auto_confirm_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Auto-confirm the user
  UPDATE auth.users
  SET email_confirmed_at = NOW()
  WHERE id = NEW.id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to auto-confirm users
DROP TRIGGER IF EXISTS on_auth_user_created_auto_confirm ON auth.users;
CREATE TRIGGER on_auth_user_created_auto_confirm
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_confirm_user();

