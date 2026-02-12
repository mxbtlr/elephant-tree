# Quick Start - Self-Hosted Supabase

## Your Configuration

Your self-hosted Supabase instance:
- **URL**: `http://87.106.6.59:8000`
- **Anon Key**: (Get from your Supabase Studio Settings > API)

## Step 1: Create Environment File

The `client/.env` file is already configured with:
```env
REACT_APP_SUPABASE_URL=http://87.106.6.59:8000
REACT_APP_SUPABASE_ANON_KEY=your-anon-key-here
```

**Important**: Make sure the anon key is correct. Get it from:
1. Access your Supabase Studio at `http://87.106.6.59:8000`
2. Go to Settings > API
3. Copy the "anon" or "public" key
4. Update it in `client/.env`

## Step 2: Install Dependencies

```bash
cd client
npm install
```

## Step 3: Test Connection

```bash
# From project root
npm run test-supabase
```

Or test manually in browser console after starting the app.

## Step 4: Run Database Migrations

1. Access your Supabase Studio: `http://87.106.6.59:8000`
2. Go to SQL Editor
3. Run migrations in order:
   - `supabase/migrations/001_initial_schema.sql`
   - `supabase/migrations/002_row_level_security.sql`
   - `supabase/migrations/003_handle_new_user.sql`

## Step 5: Start Development Server

```bash
cd client
npm start
```

The app will open at `http://localhost:3000`

## Step 6: Create First User

1. Register a new user in the app
2. Make them admin by running in SQL Editor:

```sql
UPDATE public.profiles
SET role = 'admin'
WHERE email = 'your-email@example.com';
```

## Troubleshooting

### Connection Issues

If you see connection errors:
1. Verify the URL is accessible: `curl https://lxllawvjhewgpzcvhdjl.supabase.co/rest/v1/`
2. Check CORS settings in Supabase Studio
3. Verify the anon key is correct

### Migration Issues

If migrations fail:
1. Check SQL syntax
2. Verify you're running them in order
3. Check for existing tables that might conflict

### Authentication Issues

If auth doesn't work:
1. Verify email provider is enabled in Supabase Studio
2. Check Site URL and Redirect URLs are configured
3. Verify SMTP settings if using email confirmation

## Next Steps

- See `SELF_HOSTED_SUPABASE.md` for detailed configuration
- See `SUPABASE_SETUP.md` for general Supabase setup
- See `DEPLOYMENT.md` for production deployment

