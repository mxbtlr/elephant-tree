# Migration Guide: From Express/JSON to Supabase

This guide helps you migrate from the Express.js backend with JSON storage to Supabase.

## Overview

The migration involves:
1. Setting up Supabase
2. Running database migrations
3. Updating frontend to use Supabase client
4. Migrating existing data (optional)

## Step 1: Set Up Supabase

Follow the instructions in `SUPABASE_SETUP.md` to:
- Create a Supabase project
- Run database migrations
- Configure authentication

## Step 2: Update Frontend Configuration

### 2.1 Install Supabase Client

The package.json has been updated to include `@supabase/supabase-js`. Install dependencies:

```bash
cd client
npm install
```

### 2.2 Create Environment File

Create `client/.env`:

```env
REACT_APP_SUPABASE_URL=https://your-project.supabase.co
REACT_APP_SUPABASE_ANON_KEY=your-anon-key
```

### 2.3 Update API Service

Replace the API service import in your components:

**Before:**
```javascript
import api from '../services/api';
```

**After:**
```javascript
import api from '../services/supabaseApi';
```

### 2.4 Update Authentication Flow

The authentication flow changes from token-based to session-based:

**Before (Express):**
```javascript
const { token, user } = await api.login({ email, password });
localStorage.setItem('ost_token', token);
```

**After (Supabase):**
```javascript
const { user } = await api.login({ email, password });
// Session is automatically managed by Supabase
```

## Step 3: Update Components

### 3.1 Login Component

Update `client/src/components/Login.js`:

```javascript
// Replace api import
import api from '../services/supabaseApi';

// Update login handler
const handleLogin = async (e) => {
  e.preventDefault();
  try {
    const { user } = await api.login({ email, password });
    setCurrentUser(user);
    // Supabase handles session automatically
  } catch (error) {
    alert(error.message);
  }
};
```

### 3.2 App.js

Update `client/src/App.js`:

```javascript
import { supabase } from './services/supabase';
import api from './services/supabaseApi';

// Replace getCurrentUser call
useEffect(() => {
  // Check for existing session
  supabase.auth.getSession().then(({ data: { session } }) => {
    if (session) {
      api.getCurrentUser().then(setCurrentUser);
    }
  });

  // Listen for auth changes
  const { data: { subscription } } = supabase.auth.onAuthStateChange(
    async (event, session) => {
      if (session) {
        const user = await api.getCurrentUser();
        setCurrentUser(user);
      } else {
        setCurrentUser(null);
      }
    }
  );

  return () => subscription.unsubscribe();
}, []);
```

## Step 4: Data Migration (Optional)

If you have existing data in `server/data.json`, you can migrate it:

### 4.1 Create Migration Script

Create `scripts/migrate-to-supabase.js`:

```javascript
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY; // Use service role for migration
const supabase = createClient(supabaseUrl, supabaseKey);

async function migrate() {
  const data = JSON.parse(
    fs.readFileSync(path.join(__dirname, '../server/data.json'), 'utf8')
  );

  // Migrate users first
  for (const user of data.users || []) {
    // Create auth user
    const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
      email: user.email,
      password: user.password || 'temp-password-change-me',
      email_confirm: true
    });

    if (authError && !authError.message.includes('already registered')) {
      console.error('Error creating user:', authError);
      continue;
    }

    // Update profile
    if (authUser) {
      await supabase
        .from('profiles')
        .update({
          name: user.name,
          role: user.role || 'user'
        })
        .eq('id', authUser.user.id);
    }
  }

  // Migrate teams
  const teamMap = new Map();
  for (const team of data.teams || []) {
    const { data: newTeam, error } = await supabase
      .from('teams')
      .insert({
        name: team.name,
        description: team.description,
        created_by: team.createdBy // Map old user ID to new
      })
      .select()
      .single();

    if (!error && newTeam) {
      teamMap.set(team.id, newTeam.id);
    }
  }

  // Migrate outcomes, opportunities, solutions, tests, KPIs
  // ... (similar pattern for each entity type)

  console.log('Migration complete!');
}

migrate().catch(console.error);
```

### 4.2 Run Migration

```bash
SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/migrate-to-supabase.js
```

## Step 5: Testing

### 5.1 Test Authentication

1. Register a new user
2. Login
3. Logout
4. Test password reset

### 5.2 Test CRUD Operations

1. Create an outcome
2. Add opportunity, solution, test, KPI
3. Edit entities
4. Delete entities
5. Test team functionality

### 5.3 Test Permissions

1. Create a team
2. Add members with different roles
3. Test access control
4. Verify RLS policies work

## Step 6: Deployment

Follow `DEPLOYMENT.md` for production deployment.

## Breaking Changes

### API Response Format

Supabase returns data in a slightly different format:

**Before:**
```javascript
const outcome = await api.getOutcome(id);
// outcome is the object directly
```

**After:**
```javascript
const outcome = await api.getOutcome(id);
// outcome is still the object, but nested queries return differently
```

### Error Handling

Supabase errors have a different structure:

**Before:**
```javascript
catch (error) {
  if (error.response?.status === 401) {
    // handle
  }
}
```

**After:**
```javascript
catch (error) {
  if (error.message.includes('JWT')) {
    // handle auth error
  }
}
```

### Session Management

Sessions are now managed automatically by Supabase:

- No need to store tokens manually
- Sessions persist across page refreshes
- Automatic token refresh

## Rollback Plan

If you need to rollback:

1. Keep the old Express server running
2. Switch back to `api.js` instead of `supabaseApi.js`
3. Update environment variables to point to Express server
4. Rebuild and redeploy

## Support

For issues during migration:
- Check Supabase logs in dashboard
- Review browser console for errors
- Verify RLS policies are correct
- Test with a fresh Supabase project first

