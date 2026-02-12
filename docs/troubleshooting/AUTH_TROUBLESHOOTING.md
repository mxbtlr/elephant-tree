# Authentication Troubleshooting

If authentication is not working, check the following:

## Common Issues

### 1. Email Confirmation Required

If your Supabase instance requires email confirmation:

**Solution**: Disable email confirmation in Supabase Studio:
1. Go to `http://87.106.6.59:8000`
2. Navigate to **Authentication** > **Settings**
3. Disable **"Enable email confirmations"** (for development)
4. Or configure SMTP to send confirmation emails

### 2. Profile Not Created Automatically

If the trigger to create profiles isn't working:

**Check**: Run this in SQL Editor:
```sql
-- Check if trigger exists
SELECT * FROM pg_trigger WHERE tgname = 'on_auth_user_created';

-- If not, run migration 003_handle_new_user.sql again
```

**Manual fix**: After registering, manually create profile:
```sql
INSERT INTO public.profiles (id, email, name, role)
SELECT id, email, raw_user_meta_data->>'name', 'user'
FROM auth.users
WHERE id NOT IN (SELECT id FROM public.profiles);
```

### 3. JWT Secret Mismatch

If you get JWT errors:

**Check**: The anon key must match your Supabase JWT secret configuration.

**Solution**: 
1. Get the correct anon key from Supabase Studio > Settings > API
2. Update `client/.env` with the correct key

### 4. CORS Issues

If you see CORS errors in browser console:

**Solution**: 
1. In Supabase Studio, go to Settings > API
2. Add `http://localhost:3000` to allowed origins
3. For production, add your domain

### 5. Authentication Endpoint Not Accessible

If auth endpoints return errors:

**Check**: Verify your Supabase instance is running:
```bash
curl http://87.106.6.59:8000/auth/v1/health
```

**Solution**: 
- Check Supabase service is running
- Verify network connectivity
- Check firewall rules

### 6. Database Migrations Not Run

If you see "relation does not exist" errors:

**Solution**: Run migrations in order:
1. `001_initial_schema.sql`
2. `002_row_level_security.sql`
3. `003_handle_new_user.sql`

## Testing Authentication

### Test Registration
```javascript
// In browser console
const { supabase } = await import('./services/supabase');
const { data, error } = await supabase.auth.signUp({
  email: 'test@example.com',
  password: 'testpassword123'
});
console.log('Registration:', data, error);
```

### Test Login
```javascript
const { data, error } = await supabase.auth.signInWithPassword({
  email: 'test@example.com',
  password: 'testpassword123'
});
console.log('Login:', data, error);
```

### Check Current Session
```javascript
const { data: { session } } = await supabase.auth.getSession();
console.log('Session:', session);
```

## Debug Steps

1. **Check Browser Console**: Look for specific error messages
2. **Check Network Tab**: See what requests are failing
3. **Check Supabase Logs**: In Supabase Studio, check logs for errors
4. **Verify Environment Variables**: Make sure `.env` file is correct
5. **Test Direct API Calls**: Use curl or Postman to test Supabase endpoints

## Quick Fixes

### Disable Email Confirmation (Development)
```sql
-- In Supabase SQL Editor
UPDATE auth.config 
SET enable_signup = true, 
    enable_email_confirmations = false;
```

### Create Profile Manually
```sql
-- After user registers
INSERT INTO public.profiles (id, email, name, role)
VALUES (
  'user-uuid-here',
  'user@example.com',
  'User Name',
  'user'
);
```

### Reset User Password
```sql
-- In Supabase SQL Editor (requires service_role key)
-- Or use Supabase Studio > Authentication > Users > Reset Password
```

## Still Not Working?

1. Check Supabase instance logs
2. Verify all migrations ran successfully
3. Check RLS policies aren't blocking access
4. Test with a fresh browser session (clear cache/cookies)
5. Try incognito/private browsing mode

