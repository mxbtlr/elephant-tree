# Getting Your Supabase Anon Key

If you're getting a JWT key error, you need to get the correct anon key from your self-hosted Supabase instance.

## Steps

1. **Access Supabase Studio**:
   - Go to: `http://87.106.6.59:8000`
   - Login with your admin credentials

2. **Navigate to Settings**:
   - Click on the gear icon (⚙️) or go to Settings
   - Select **API** from the menu

3. **Find the Anon Key**:
   - Look for "anon" or "public" key
   - It should be a JWT token starting with `eyJ...`
   - Copy the entire key

4. **Update your .env file**:
   ```bash
   # Edit client/.env
   REACT_APP_SUPABASE_URL=http://87.106.6.59:8000
   REACT_APP_SUPABASE_ANON_KEY=paste-your-anon-key-here
   ```

5. **Test the connection**:
   ```bash
   npm run test-supabase
   ```

## Alternative: Check Kong API Gateway

If you're using Kong as the API gateway for your self-hosted Supabase:

1. Check Kong configuration for the anon key
2. Or check your Supabase configuration files
3. The key should be in your `.env` file in the Supabase deployment

## Note

The current key in your `.env` appears to be a demo/development key. You need the actual anon key from your self-hosted instance configuration.

