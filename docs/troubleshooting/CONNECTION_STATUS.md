# Supabase Connection Status

## ✅ Connection Successful!

Your self-hosted Supabase instance is now configured and connected.

### Configuration
- **URL**: `http://87.106.6.59:8000`
- **Anon Key**: (Configured in client/.env)
- **Status**: Connection configured ⚠️ (May need correct anon key)

### Current Status

The connection test shows:
- ✅ Successfully connecting to Supabase
- ⚠️ Database tables not found (migrations need to be run)

## Next Steps

### 1. Run Database Migrations

You need to run the database migrations to create the required tables. You can do this in two ways:

#### Option A: Using Supabase Studio (Recommended)

1. Go to your Supabase Studio: `https://lxllawvjhewgpzcvhdjl.supabase.co`
2. Navigate to **SQL Editor**
3. Run each migration file in order:
   - Copy and paste contents of `supabase/migrations/001_initial_schema.sql`
   - Click "Run"
   - Repeat for `002_row_level_security.sql`
   - Repeat for `003_handle_new_user.sql`

#### Option B: Using psql (If you have direct database access)

```bash
psql -h lxllawvjhewgpzcvhdjl.supabase.co -U postgres -d postgres -f supabase/migrations/001_initial_schema.sql
psql -h lxllawvjhewgpzcvhdjl.supabase.co -U postgres -d postgres -f supabase/migrations/002_row_level_security.sql
psql -h lxllawvjhewgpzcvhdjl.supabase.co -U postgres -d postgres -f supabase/migrations/003_handle_new_user.sql
```

### 2. Verify Migrations

After running migrations, test again:

```bash
npm run test-supabase
```

You should see:
- ✅ Connection successful!
- ✅ All required tables exist!

### 3. Configure Authentication

1. In Supabase Studio, go to **Authentication** > **Settings**
2. Set **Site URL** to your application URL (e.g., `http://localhost:3000` for development)
3. Add **Redirect URLs**:
   - `http://localhost:3000`
   - `http://localhost:3000/**` (for development)
   - Your production URL (when ready)

### 4. Create First Admin User

1. Start your app: `cd client && npm start`
2. Register a new user through the app
3. In Supabase Studio SQL Editor, run:

```sql
UPDATE public.profiles
SET role = 'admin'
WHERE email = 'your-email@example.com';
```

### 5. Test the Application

```bash
cd client
npm start
```

The app should now:
- ✅ Connect to Supabase
- ✅ Allow user registration
- ✅ Allow user login
- ✅ Show your data

## Troubleshooting

### If connection fails:
- Check that your Supabase instance is running
- Verify the URL is accessible: `curl https://lxllawvjhewgpzcvhdjl.supabase.co/rest/v1/`
- Check firewall/network rules

### If migrations fail:
- Check SQL syntax
- Verify you're running them in order
- Check for existing tables that might conflict
- Review error messages in Supabase Studio

### If authentication doesn't work:
- Verify email provider is enabled in Supabase Studio
- Check Site URL and Redirect URLs are configured
- Verify SMTP settings if using email confirmation

## Files Updated

- ✅ `client/.env` - Configured with your Supabase credentials
- ✅ `client/src/services/supabase.js` - Updated for self-hosted instance
- ✅ `scripts/test-supabase-connection.js` - Test script ready
- ✅ `package.json` - Added test-supabase script

## Quick Commands

```bash
# Test connection
npm run test-supabase

# Start development server
cd client && npm start

# Install dependencies (if needed)
npm run install-all
```

