# Fix "Signal is Aborted" Login Error

The "signal is aborted" error typically occurs with self-hosted Supabase instances due to authentication flow issues.

## What I Fixed

1. **Changed auth flow**: From `pkce` to `password` flow (better for self-hosted)
2. **Disabled URL detection**: Set `detectSessionInUrl: false` to avoid redirect issues
3. **Improved error handling**: Better error messages for abort/timeout errors
4. **Added retry logic**: Handles cases where profile creation is delayed

## If Login Still Fails

### Check 1: Verify Supabase Auth Endpoint

Test if the auth endpoint is accessible:

```bash
curl -X POST http://87.106.6.59:8000/auth/v1/token \
  -H "Content-Type: application/json" \
  -H "apikey: YOUR_ANON_KEY" \
  -d '{"email":"test@example.com","password":"test123","grant_type":"password"}'
```

### Check 2: Verify CORS Settings

Make sure CORS is configured in your Supabase instance:
- Add `http://localhost:3000` to allowed origins
- Check Kong/API Gateway CORS configuration

### Check 3: Check Browser Console

Look for specific errors:
- Network errors (CORS, timeout)
- Authentication errors
- Connection refused errors

### Check 4: Test Direct API Call

Try logging in directly via API:

```javascript
// In browser console
const { supabase } = await import('./services/supabase');
const { data, error } = await supabase.auth.signInWithPassword({
  email: 'your-email@example.com',
  password: 'your-password'
});
console.log('Login result:', { data, error });
```

### Check 5: Verify Auth Service is Running

Check if the auth service is accessible:
```bash
curl http://87.106.6.59:8000/auth/v1/health
```

## Alternative: Use Service Role (Development Only)

⚠️ **WARNING**: Only for development, never in production!

If auth continues to fail, you can temporarily bypass RLS by using the service role key (but this is NOT recommended for production).

## Common Causes

1. **PKCE flow not supported**: Self-hosted instances might not support PKCE - fixed by using `password` flow
2. **Timeout issues**: Network latency causing requests to timeout
3. **CORS blocking**: Browser blocking cross-origin requests
4. **Auth service down**: The auth service might not be running

## Next Steps

1. Try logging in again
2. Check browser console for the exact error
3. Check network tab to see which request is failing
4. Share the specific error message if it persists

