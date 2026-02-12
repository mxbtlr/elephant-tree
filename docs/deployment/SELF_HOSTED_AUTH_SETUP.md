# Self-Hosted Supabase Authentication Setup

Since you're using a self-hosted Supabase instance, authentication configuration is different from the hosted version.

## Quick Fix: Disable Email Confirmation

### Option 1: Via SQL (Recommended)

Run this in your Supabase SQL Editor:

```sql
-- Auto-confirm users on signup
CREATE OR REPLACE FUNCTION public.auto_confirm_user()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE auth.users
  SET email_confirmed_at = NOW()
  WHERE id = NEW.id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger
DROP TRIGGER IF EXISTS on_auth_user_created_auto_confirm ON auth.users;
CREATE TRIGGER on_auth_user_created_auto_confirm
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_confirm_user();
```

Or run the migration file:
```bash
# In Supabase SQL Editor, run:
supabase/migrations/004_disable_email_confirmation.sql
```

### Option 2: Via Environment Variables

If you have access to your Supabase server configuration:

1. Find your Supabase `.env` file or configuration
2. Add or update:
   ```env
   ENABLE_EMAIL_CONFIRMATIONS=false
   ```
3. Restart Supabase services

### Option 3: Via Kong/API Gateway Config

If you're using Kong as the API gateway:

1. Check your Kong configuration
2. Look for auth-related settings
3. Disable email confirmation requirement

## Verify Configuration

After applying the fix, test registration:

1. Try registering a new user in the app
2. Check if you can login immediately (without email confirmation)
3. Check browser console for any errors

## Manual User Confirmation (If Needed)

If a user is already created but not confirmed, you can manually confirm them:

```sql
-- Confirm a user by email
UPDATE auth.users
SET email_confirmed_at = NOW()
WHERE email = 'user@example.com';
```

## Test Authentication

After setup, test in browser console:

```javascript
// Test registration
const { supabase } = await import('./services/supabase');
const { data, error } = await supabase.auth.signUp({
  email: 'test@example.com',
  password: 'test123456'
});
console.log('Registration:', { data, error });

// Should have a session immediately
console.log('Session:', data.session);
```

## Troubleshooting

### Users Created But Can't Login

If users are created but can't login:

```sql
-- Check if users are confirmed
SELECT id, email, email_confirmed_at, created_at 
FROM auth.users 
ORDER BY created_at DESC;

-- Confirm all unconfirmed users
UPDATE auth.users
SET email_confirmed_at = COALESCE(email_confirmed_at, NOW())
WHERE email_confirmed_at IS NULL;
```

### Profile Not Created

If the profile trigger isn't working:

```sql
-- Check if trigger exists
SELECT * FROM pg_trigger WHERE tgname = 'on_auth_user_created';

-- Manually create profiles for existing users
INSERT INTO public.profiles (id, email, name, role)
SELECT 
  id, 
  email, 
  COALESCE(raw_user_meta_data->>'name', email),
  'user'
FROM auth.users
WHERE id NOT IN (SELECT id FROM public.profiles);
```

### Still Having Issues?

1. Check Supabase logs for auth errors
2. Verify the auth service is running
3. Check network connectivity to auth endpoints
4. Verify JWT secret matches your anon key

