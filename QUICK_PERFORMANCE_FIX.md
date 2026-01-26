# Quick Performance Fix for Slow Connections

## Best Solution: Use Local Supabase (Recommended)

The fastest way to eliminate slow connections is to run Supabase locally:

### Quick Setup (5 minutes)

1. **Install Docker** (if not already installed)
   - macOS: `brew install docker`
   - Or download from docker.com

2. **Start Local Supabase**
```bash
git clone --depth 1 https://github.com/supabase/supabase
cd supabase/docker
cp .env.example .env
docker-compose up -d
```

3. **Get Local Keys**
   - Open http://localhost:8000 in browser
   - Go to Settings > API
   - Copy the "anon" key

4. **Update `.env` file**
```bash
# In client/.env
REACT_APP_SUPABASE_URL=http://localhost:8000
REACT_APP_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0
```

5. **Run Migrations Locally**
   - Copy your migration files to the local Supabase
   - Or use Supabase Studio at http://localhost:8000

**Result:** Zero network latency, instant responses! 🚀

## Alternative: Optimize Current Setup

If you must use the remote server, I've added:

1. **Request Caching** - Reduces repeated API calls (30 second cache)
2. **Connection Keep-Alive** - Reuses HTTP connections
3. **Increased Timeouts** - 20 seconds for slow connections

### What's Already Done:

✅ Added 30-second caching for outcomes and teams  
✅ Connection keep-alive enabled  
✅ Timeouts increased to 20 seconds  
✅ Better error handling and logging  

### Test Your Connection Speed

Run this to see actual latency:
```bash
time curl -X POST https://api.maxbeitler.com/auth/v1/token \
  -H "Content-Type: application/json" \
  -d '{"email":"test","password":"test"}'
```

If it takes > 5 seconds, **definitely use local Supabase for development**.

## Performance Tips

1. **Use Local for Development** - Biggest impact
2. **Cache is Now Active** - Reduces redundant requests
3. **Check Network Tab** - See which requests are slow
4. **Use Browser DevTools** - Monitor request timing

## Next Steps

1. Try local Supabase setup (recommended)
2. If using remote, check browser console for timing info
3. Consider using a VPN if server is geo-restricted
4. For production, optimize database queries and add indexes

