# Self-Hosted Supabase Configuration

This guide covers connecting TreeFlow to a self-hosted Supabase instance.

## Configuration

Your self-hosted Supabase instance is configured in `client/.env`:

```env
REACT_APP_SUPABASE_URL=https://lxllawvjhewgpzcvhdjl.supabase.co
REACT_APP_SUPABASE_ANON_KEY=sb_publishable_mx5v9PYyqqGEuQYzV3P62Q_dU7OwDMt
```

## Setup Steps

### 1. Verify Connection

Test the connection by running:

```bash
cd client
npm start
```

Check the browser console for any connection errors.

### 2. Run Database Migrations

Since you have a self-hosted instance, you'll need to run the migrations manually:

1. **Connect to your Supabase instance**:
   - Use the Supabase Studio (usually at `https://lxllawvjhewgpzcvhdjl.supabase.co`)
   - Or connect via psql if you have direct database access

2. **Run migrations in order**:
   - Go to SQL Editor in Supabase Studio
   - Run `supabase/migrations/001_initial_schema.sql`
   - Run `supabase/migrations/002_row_level_security.sql`
   - Run `supabase/migrations/003_handle_new_user.sql`

### 3. Configure Authentication

1. **Access Supabase Studio**:
   - Navigate to `https://lxllawvjhewgpzcvhdjl.supabase.co`
   - Login with your admin credentials

2. **Configure Auth Settings**:
   - Go to Authentication > Settings
   - Set **Site URL** to your application URL
   - Add **Redirect URLs** for your domain(s)
   - Configure email settings (SMTP) if needed

3. **Enable Email Provider**:
   - Go to Authentication > Providers
   - Enable Email provider
   - Configure email templates if needed

### 4. Set Up First Admin User

After running migrations and creating your first user:

```sql
-- Make a user admin
UPDATE public.profiles
SET role = 'admin'
WHERE email = 'your-email@example.com';
```

## Self-Hosted Specific Considerations

### CORS Configuration

If you encounter CORS errors, you may need to configure CORS in your self-hosted Supabase:

1. **In Supabase Studio**:
   - Go to Settings > API
   - Add your frontend domain to allowed origins

2. **Or via Kong/API Gateway** (if using self-hosted):
   - Configure CORS headers in your API gateway
   - Allow your frontend domain

### SSL/TLS

Ensure your self-hosted instance has valid SSL certificates:
- The URL should use `https://`
- Certificates should be valid and not expired
- Browser should trust the certificate

### Network Access

Ensure your application can reach the Supabase instance:
- Check firewall rules
- Verify network connectivity
- Test from browser console: `fetch('https://lxllawvjhewgpzcvhdjl.supabase.co/rest/v1/')`

### Database Connection

If you need direct database access:

```bash
# Connection string format
postgresql://postgres:[PASSWORD]@[HOST]:[PORT]/postgres

# Example
psql postgresql://postgres:yourpassword@lxllawvjhewgpzcvhdjl.supabase.co:5432/postgres
```

## Testing the Connection

### 1. Test in Browser Console

Open browser console and run:

```javascript
// Test Supabase connection
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(
  'https://lxllawvjhewgpzcvhdjl.supabase.co',
  'sb_publishable_mx5v9PYyqqGEuQYzV3P62Q_dU7OwDMt'
);

// Test connection
supabase.from('profiles').select('count').then(console.log);
```

### 2. Test Authentication

```javascript
// Test signup
supabase.auth.signUp({
  email: 'test@example.com',
  password: 'testpassword123'
}).then(console.log);
```

### 3. Test Database Query

```javascript
// Test query (after authentication)
supabase.from('outcomes').select('*').then(console.log);
```

## Troubleshooting

### Connection Refused

- Check if Supabase instance is running
- Verify the URL is correct
- Check firewall/network rules

### CORS Errors

- Add your domain to CORS allowed origins
- Check API gateway CORS configuration
- Verify request headers

### Authentication Errors

- Verify auth is enabled in Supabase
- Check email provider configuration
- Verify redirect URLs are set correctly

### RLS Policy Errors

- Verify migrations ran successfully
- Check RLS is enabled on tables
- Verify user has proper permissions

### SSL Certificate Errors

- Ensure valid SSL certificate
- Check certificate expiration
- Verify certificate chain is complete

## Environment Variables

The `.env` file in `client/` directory contains:

```env
REACT_APP_SUPABASE_URL=https://lxllawvjhewgpzcvhdjl.supabase.co
REACT_APP_SUPABASE_ANON_KEY=sb_publishable_mx5v9PYyqqGEuQYzV3P62Q_dU7OwDMt
```

**Important**: 
- Never commit `.env` files to version control
- Use different keys for development/production if needed
- Rotate keys if compromised

## Next Steps

1. ✅ Verify connection works
2. ✅ Run database migrations
3. ✅ Configure authentication
4. ✅ Create first admin user
5. ✅ Test user registration
6. ✅ Test CRUD operations
7. ✅ Verify RLS policies

## Additional Resources

- [Supabase Self-Hosting Docs](https://supabase.com/docs/guides/self-hosting)
- [Supabase CLI](https://supabase.com/docs/reference/cli)
- [Supabase API Reference](https://supabase.com/docs/reference/javascript)

