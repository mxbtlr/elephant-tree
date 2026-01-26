# Fix Login Issue with Production Build

## Problem
When running a production build locally, login fails because environment variables (`REACT_APP_SUPABASE_URL` and `REACT_APP_SUPABASE_ANON_KEY`) are embedded at build time. If they weren't set during the build, the app won't work.

## Solutions

### Option 1: Rebuild with Environment Variables (Recommended)

1. **Ensure your `.env` file exists in `client/` directory:**
   ```bash
   cd client
   cat .env
   ```
   
   It should contain:
   ```
   REACT_APP_SUPABASE_URL=http://your-supabase-url:8000
   REACT_APP_SUPABASE_ANON_KEY=your-anon-key-here
   ```

2. **Rebuild the app:**
   ```bash
   cd client
   npm run build
   ```

3. **Serve the build:**
   ```bash
   # Option A: Using serve (install with: npm install -g serve)
   serve -s build -l 3000
   
   # Option B: Using Python
   cd build
   python3 -m http.server 3000
   ```

### Option 2: Configure Runtime (No Rebuild Needed)

If you can't rebuild, you can inject configuration at runtime:

1. **Edit the built `index.html` file:**
   ```bash
   # The file is at: client/build/index.html
   ```

2. **Find the script tag with `window.__ENV__` and uncomment/set values:**
   ```html
   <script>
     window.__ENV__ = {
       REACT_APP_SUPABASE_URL: 'http://your-supabase-url:8000',
       REACT_APP_SUPABASE_ANON_KEY: 'your-anon-key-here'
     };
   </script>
   ```

3. **Or add meta tags that the script will read:**
   ```html
   <meta name="supabase-url" content="http://your-supabase-url:8000" />
   <meta name="supabase-key" content="your-anon-key-here" />
   ```

### Option 3: Development Mode (For Testing)

If you just need to test, run in development mode:

```bash
cd client
npm start
```

This will use the `.env` file directly without needing a rebuild.

## Verification

After applying the fix, check the browser console. You should see:
```
✅ Supabase URL configured: http://your-supabase-url:8000
```

If you see an error about missing environment variables, the configuration wasn't applied correctly.

## Finding Your Supabase Configuration

If you don't know your Supabase URL and anon key:

1. **Check your `.env` file:**
   ```bash
   cat client/.env
   ```

2. **Or get it from Supabase Studio:**
   - Go to your Supabase Studio URL (e.g., `http://87.106.6.59:8000`)
   - Navigate to Settings > API
   - Copy the URL and anon/public key

3. **Or check your Supabase server configuration:**
   ```bash
   # On your Supabase server
   cat /path/to/supabase/.env | grep -E "(URL|ANON_KEY)"
   ```

## Common Issues

### Issue: "Missing Supabase environment variables" error
**Solution**: Follow Option 1 or Option 2 above to set the configuration.

### Issue: Login times out
**Solution**: 
- Check if your Supabase server is running and accessible
- Verify the URL is correct (try accessing it in a browser)
- Check network connectivity

### Issue: "Invalid login credentials"
**Solution**: 
- Verify your username and password
- Check if email confirmation is disabled in Supabase
- Check if the user exists in Supabase

### Issue: CORS errors
**Solution**: 
- Make sure your Supabase instance allows requests from your origin
- Check Supabase CORS configuration in Kong/API Gateway settings
