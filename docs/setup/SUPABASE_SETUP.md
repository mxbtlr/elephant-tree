# Supabase Setup Guide for TreeFlow

This guide covers setting up Supabase as the backend for TreeFlow, including database schema, authentication, and user management.

## Overview

TreeFlow uses Supabase for:
- **Authentication**: User signup, login, password management
- **Database**: PostgreSQL with Row Level Security (RLS)
- **Real-time**: (Optional) Real-time updates
- **Storage**: (Optional) File storage for attachments

## Quick Start

### 1. Create Supabase Project

1. Go to [supabase.com](https://supabase.com)
2. Click "New Project"
3. Fill in:
   - **Name**: TreeFlow (or your preferred name)
   - **Database Password**: Choose a strong password
   - **Region**: Choose closest to your users
4. Wait for project to be created (2-3 minutes)

### 2. Get Your Credentials

1. Go to **Settings** > **API**
2. Copy:
   - **Project URL**: `https://lxllawvjhewgpzcvhdjl.supabase.co`
   - **anon/public key**: `sb_publishable_mx5v9PYyqqGEuQYzV3P62Q_dU7OwDMt`

### 3. Run Migrations

#### Option A: Using Supabase CLI (Recommended)

```bash
# Install Supabase CLI
npm install -g supabase

# Login to Supabase
supabase login

# Link your project
supabase link --project-ref your-project-ref

# Push migrations
supabase db push
```

#### Option B: Using SQL Editor

1. Go to **SQL Editor** in Supabase dashboard
2. Run each migration file in order:
   - `supabase/migrations/001_initial_schema.sql`
   - `supabase/migrations/002_row_level_security.sql`
   - `supabase/migrations/003_handle_new_user.sql`

### 4. Configure Authentication

1. Go to **Authentication** > **Settings**
2. Configure:
   - **Site URL**: Your application URL
   - **Redirect URLs**: Add your domain(s)
   - **Email**: Configure SMTP (optional for development)

### 5. Set Up First Admin User

1. Register a user through your application
2. Go to **SQL Editor** and run:

```sql
UPDATE public.profiles
SET role = 'admin'
WHERE email = 'your-email@example.com';
```

## Database Schema

### Tables Overview

- **profiles**: User profiles (extends auth.users)
- **teams**: Team/organization management
- **team_memberships**: User-team relationships with roles
- **outcomes**: Top-level outcomes
- **opportunities**: Opportunities within outcomes
- **solutions**: Solutions within opportunities
- **tests**: Tests within solutions
- **kpis**: KPIs within tests
- **comments**: Comments on any entity
- **kpi_templates**: Reusable KPI templates
- **data_sources**: External data source configurations
- **data_points**: Data points from sources
- **interview_notes**: Interview notes
- **note_links**: Links between notes and entities

### Key Relationships

```
outcomes
  └── opportunities
      └── solutions
          └── tests
              └── kpis
```

## Row Level Security (RLS)

All tables have RLS enabled with policies that:

1. **Users can view**:
   - Their own data
   - Public data
   - Team data (if they're members)

2. **Users can create**:
   - Their own entities
   - Entities in teams they belong to

3. **Users can update/delete**:
   - Their own entities
   - Entities in teams where they have appropriate roles

4. **Admins can**:
   - View and manage all data
   - Manage user roles
   - Manage KPI templates

## User Management

### Roles

1. **User** (default):
   - Can create and manage own outcomes
   - Can join teams
   - Can view public/team outcomes

2. **Admin**:
   - All user permissions
   - Can manage all users
   - Can manage KPI templates
   - Can access all data

### Team Roles

1. **Lead**:
   - Can manage team members
   - Can manage team outcomes
   - Can delete team data

2. **Member**:
   - Can view and edit team outcomes
   - Can create new outcomes in team

3. **Viewer**:
   - Can only view team outcomes
   - Cannot edit or create

### Managing Users

#### Make User Admin

```sql
UPDATE public.profiles
SET role = 'admin'
WHERE email = 'user@example.com';
```

#### Change User Role in Team

```sql
UPDATE public.team_memberships
SET role = 'lead'
WHERE user_id = 'user-uuid' AND team_id = 'team-uuid';
```

#### Remove User from Team

```sql
DELETE FROM public.team_memberships
WHERE user_id = 'user-uuid' AND team_id = 'team-uuid';
```

## Advanced Configuration

### Custom Authentication

To add OAuth providers:

1. Go to **Authentication** > **Providers**
2. Enable desired providers (Google, GitHub, etc.)
3. Configure OAuth credentials
4. Update frontend to use provider

### Email Templates

1. Go to **Authentication** > **Email Templates**
2. Customize:
   - Confirm signup
   - Reset password
   - Magic link
   - Change email

### Database Backups

Supabase automatically backs up your database:
- **Daily backups**: Retained for 7 days
- **Point-in-time recovery**: Available on Pro plan

To manually backup:

```bash
# Using Supabase CLI
supabase db dump -f backup.sql

# Or use pg_dump
pg_dump -h db.xxxxx.supabase.co -U postgres -d postgres > backup.sql
```

### Performance Optimization

1. **Indexes**: Already created on foreign keys and common queries
2. **Connection Pooling**: Use Supabase connection pooler
3. **Query Optimization**: Use `select()` to limit returned columns
4. **Pagination**: Use `range()` for large datasets

### Monitoring

1. **Database**: Go to **Database** > **Reports**
2. **API**: Go to **Settings** > **API** > **Usage**
3. **Auth**: Go to **Authentication** > **Users**

## Security Best Practices

1. **Never expose service_role key** in client code
2. **Use RLS policies** for all data access
3. **Validate input** on both client and server
4. **Use parameterized queries** (Supabase does this automatically)
5. **Enable 2FA** on Supabase account
6. **Regular security audits** of RLS policies
7. **Monitor access logs** for suspicious activity

## Troubleshooting

### Migration Errors

If migrations fail:

1. Check SQL syntax in Supabase SQL Editor
2. Verify you're running migrations in order
3. Check for existing tables that conflict

### RLS Policy Issues

If users can't access data:

1. Verify user is authenticated: `SELECT auth.uid();`
2. Check team memberships: `SELECT * FROM team_memberships WHERE user_id = auth.uid();`
3. Test policies in SQL Editor with `SET LOCAL role authenticated;`

### Connection Issues

If client can't connect:

1. Verify CORS settings in Supabase dashboard
2. Check environment variables are set
3. Verify project URL and anon key are correct
4. Check browser console for specific errors

## Migration from Express/JSON Backend

To migrate existing data:

1. Export data from `server/data.json`
2. Create migration script to import to Supabase
3. Map user IDs to Supabase auth.users
4. Update team IDs to match new UUIDs
5. Test thoroughly before switching

Example migration script structure:

```javascript
// migrate-data.js
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const oldData = JSON.parse(fs.readFileSync('data.json'));

// Migrate users, teams, outcomes, etc.
// ...
```

## Support Resources

- **Supabase Docs**: https://supabase.com/docs
- **Supabase Discord**: https://discord.supabase.com
- **Supabase GitHub**: https://github.com/supabase/supabase

## Next Steps

After setup:

1. ✅ Run migrations
2. ✅ Configure authentication
3. ✅ Create first admin user
4. ✅ Test user registration
5. ✅ Test CRUD operations
6. ✅ Verify RLS policies
7. ✅ Set up monitoring
8. ✅ Configure backups

