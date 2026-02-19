# Self-Hosted Supabase Authentication Setup

Since you're using a self-hosted Supabase instance, authentication configuration is different from the hosted version.

**TreeFlow does not use email confirmation.** Signup is gated by an invite code only; users can sign in immediately after registering. To make that work you need both: (1) Auth configured so it does not send confirmation emails, and (2) the SQL trigger that sets `email_confirmed_at` (migration 004).

## 1. Auth: Do not send confirmation email (required)

If this is not set, signup will fail with "Error sending confirmation email" when SMTP is not configured.

### Where to set it

**If you use the official [Supabase self-hosted Docker](https://github.com/supabase/supabase/tree/master/docker) setup:**

1. Open the **`.env`** file in the same folder as `docker-compose.yml` (e.g. `supabase/docker/.env` or wherever you keep your Supabase stack).
2. Add or edit:
   ```env
   ENABLE_EMAIL_AUTOCONFIRM=false
   ```
   The compose file passes this into the auth service as `GOTRUE_MAILER_AUTOCONFIRM`.
3. Restart the auth container:
   ```bash
   docker compose restart auth
   ```

**If you configure the Auth (GoTrue) container yourself** (custom compose or Kubernetes):

- Set the auth container env var **`GOTRUE_MAILER_AUTOCONFIRM=false`** (e.g. in your `docker-compose.yml` under `services.auth.environment`, or in your pod/deployment env). Then restart the auth service.

With this, GoTrue will not send or require a confirmation email.

## 2. Database: Auto-confirm users (migration 004)

### Option 1: Via SQL

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

### Option 2: Via Kong/API Gateway Config

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

