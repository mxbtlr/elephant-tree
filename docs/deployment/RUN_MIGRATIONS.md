# How to Run Database Migrations

This guide shows you how to run the database migrations for your self-hosted Supabase instance.

## Your Supabase Instance
- **URL**: `http://87.106.6.59:8000`

## Method 1: Using Supabase Studio (Easiest - Recommended)

### Step 1: Access Supabase Studio
1. Open your browser
2. Go to: `http://87.106.6.59:8000`
3. Login with your admin credentials

### Step 2: Open SQL Editor
1. In the left sidebar, click on **SQL Editor**
2. Click **New Query** button

### Step 3: Run Migration 1 - Initial Schema
1. Open the file: `supabase/migrations/001_initial_schema.sql`
2. Copy **ALL** the contents (Cmd+A, Cmd+C on Mac, or Ctrl+A, Ctrl+C on Windows)
3. Paste into the SQL Editor in Supabase Studio
4. Click **Run** button (or press Cmd+Enter / Ctrl+Enter)
5. Wait for it to complete - you should see "Success. No rows returned"

### Step 4: Run Migration 2 - Row Level Security
1. Open the file: `supabase/migrations/002_row_level_security.sql`
2. Copy **ALL** the contents
3. In Supabase Studio, click **New Query** again
4. Paste the SQL
5. Click **Run**
6. Wait for completion

### Step 5: Run Migration 3 - User Handler
1. Open the file: `supabase/migrations/003_handle_new_user.sql`
2. Copy **ALL** the contents
3. In Supabase Studio, click **New Query** again
4. Paste the SQL
5. Click **Run**
6. Wait for completion

### Step 6: Verify Migrations
1. In Supabase Studio, go to **Table Editor** in the left sidebar
2. You should see these tables:
   - profiles
   - teams
   - team_memberships
   - outcomes
   - opportunities
   - solutions
   - tests
   - kpis
   - comments
   - kpi_templates
   - data_sources
   - data_points
   - interview_notes
   - note_links

## Method 2: Using psql (Command Line)

If you have direct database access via psql:

```bash
# Connect to your database
psql -h 87.106.6.59 -p 5432 -U postgres -d postgres

# Then run each migration file
\i supabase/migrations/001_initial_schema.sql
\i supabase/migrations/002_row_level_security.sql
\i supabase/migrations/003_handle_new_user.sql

# Or run them directly
psql -h 87.106.6.59 -p 5432 -U postgres -d postgres -f supabase/migrations/001_initial_schema.sql
psql -h 87.106.6.59 -p 5432 -U postgres -d postgres -f supabase/migrations/002_row_level_security.sql
psql -h 87.106.6.59 -p 5432 -U postgres -d postgres -f supabase/migrations/003_handle_new_user.sql
```

## Method 3: Using Supabase CLI (If Configured)

If you have Supabase CLI linked to your self-hosted instance:

```bash
# Link to your self-hosted instance
supabase link --db-url postgresql://postgres:password@87.106.6.59:5432/postgres

# Push migrations
supabase db push
```

## Troubleshooting

### Error: "relation already exists"
- Some tables might already exist
- You can either:
  - Drop existing tables (if safe to do so)
  - Or skip the CREATE TABLE statements and only run the parts that don't exist

### Error: "permission denied"
- Make sure you're logged in as a user with admin/owner privileges
- Check that your user has CREATE, ALTER, and DROP permissions

### Error: "function already exists"
- The functions might already be created
- You can use `CREATE OR REPLACE FUNCTION` instead of `CREATE FUNCTION`

### Migration Fails Partway Through
- Check the error message
- Some statements might have succeeded
- You may need to manually fix the issue and continue

## Verify Migrations Worked

After running migrations, test the connection:

```bash
npm run test-supabase
```

You should see:
- ✅ Connection successful!
- ✅ All required tables exist!
- ✅ RLS functions exist!

## Next Steps

After migrations are complete:

1. **Configure Authentication**:
   - Go to Authentication > Settings in Supabase Studio
   - Set Site URL: `http://localhost:3000` (for development)
   - Add Redirect URLs

2. **Create First Admin User**:
   - Start your app: `cd client && npm start`
   - Register a user
   - In SQL Editor, run:
     ```sql
     UPDATE public.profiles
     SET role = 'admin'
     WHERE email = 'your-email@example.com';
     ```

3. **Test the Application**:
   ```bash
   cd client
   npm start
   ```

## Quick Reference

Migration files location: `supabase/migrations/`
- `001_initial_schema.sql` - Creates all tables
- `002_row_level_security.sql` - Sets up RLS policies
- `003_handle_new_user.sql` - Auto-creates profiles on signup

Run them in this exact order!

