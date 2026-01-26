# Getting the Correct Anon Key

The JWT key error means the anon key in your `.env` file might not be correct for your self-hosted Supabase instance.

## Steps to Get the Correct Key

### Option 1: From Supabase Studio

1. **Access Supabase Studio**:
   - Go to: `http://87.106.6.59:8000`
   - Login with your admin credentials

2. **Navigate to Settings**:
   - Click on **Settings** (gear icon) in the left sidebar
   - Click on **API** section

3. **Find the Anon Key**:
   - Look for **"anon"** or **"public"** key
   - It should be a JWT token (long string starting with `eyJ...`)
   - Copy the entire key

4. **Update your .env file**:
   ```bash
   # Edit client/.env
   REACT_APP_SUPABASE_URL=http://87.106.6.59:8000
   REACT_APP_SUPABASE_ANON_KEY=paste-the-correct-key-here
   ```

### Option 2: From Supabase Configuration Files

If you have access to your Supabase server files:

1. **Check your Supabase `.env` file**:
   ```bash
   # On your Supabase server
   cat /path/to/supabase/.env | grep ANON_KEY
   ```

2. **Or check Kong configuration**:
   - The anon key is usually configured in Kong API Gateway
   - Look for `SUPABASE_ANON_KEY` or `ANON_KEY` in your Supabase deployment config

### Option 3: From Database

If you have database access, you can check:

```sql
-- Connect to your database
psql -h 87.106.6.59 -p 5432 -U postgres -d postgres

-- Check JWT secret (this is used to verify the anon key)
SHOW app.jwt_secret;
```

## Current Key Format

The current key in your `.env` appears to be a demo/development key. For a self-hosted instance, you need the actual anon key that matches your JWT secret configuration.

## After Updating the Key

1. **Save the .env file**

2. **Test the connection**:
   ```bash
   node scripts/test-supabase-connection.js
   # or
   npm run test-supabase
   ```

3. **You should see**:
   - ✅ Connection successful!
   - (Or a message about missing tables, which means you need to run migrations)

## If You Can't Find the Key

If you can't find the anon key:

1. **Check your Supabase deployment documentation**
2. **Check your server configuration files**
3. **Contact your system administrator** if this is a managed instance
4. **Re-generate the key** if you have admin access to the Supabase instance

## Quick Test

Once you have the correct key, the test should work. If you still get JWT errors after updating, the issue might be:
- JWT secret mismatch between the key and server configuration
- Wrong key type (using service_role instead of anon)
- Key format issues

