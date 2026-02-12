# Local Development Setup for Supabase

If your remote Supabase instance (`api.maxbeitler.com`) is slow or unreachable from localhost, you can set up a local Supabase instance for development.

## Option 1: Quick Test - Use Local Supabase URL

If you have a local Supabase instance running, update your `.env` file:

```bash
# In client/.env
REACT_APP_SUPABASE_URL=http://localhost:8000
REACT_APP_SUPABASE_ANON_KEY=your-local-anon-key
```

## Option 2: Run Supabase Locally with Docker

### Prerequisites
- Docker and Docker Compose installed

### Steps

1. **Clone Supabase**
```bash
git clone --depth 1 https://github.com/supabase/supabase
cd supabase/docker
```

2. **Copy environment file**
```bash
cp .env.example .env
```

3. **Start Supabase**
```bash
docker-compose up -d
```

4. **Get your local keys**
```bash
# Anon key is in the .env file or check:
docker-compose exec supabase_db cat /etc/postgresql/postgresql.conf
```

5. **Update your .env file**
```bash
# In client/.env
REACT_APP_SUPABASE_URL=http://localhost:8000
REACT_APP_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0
```

6. **Run migrations**
```bash
# Copy your migrations to the local instance
# Or use Supabase Studio at http://localhost:8000
```

## Option 3: Use SSH Tunnel (If Server is Behind Firewall)

If your server is only accessible from certain networks:

```bash
# Create SSH tunnel
ssh -L 8000:localhost:8000 user@your-server-ip

# Then in another terminal, update .env:
REACT_APP_SUPABASE_URL=http://localhost:8000
```

## Option 4: Check Network Speed

Test if the issue is network latency:

```bash
# Test ping
ping api.maxbeitler.com

# Test connection speed
time curl -X POST https://api.maxbeitler.com/auth/v1/token \
  -H "Content-Type: application/json" \
  -d '{"email":"test","password":"test"}'
```

If ping times are > 100ms or curl takes > 5 seconds, consider using a local instance for development.

## Option 5: Use Environment-Specific URLs

Create different `.env` files:

- `.env.development` - Use local Supabase
- `.env.production` - Use remote Supabase

Then in your build process, use the appropriate file.

## Quick Fix: Increase Timeout

If you want to keep using the remote server but it's just slow, the timeout is already set to 10 seconds. You can increase it in `client/src/services/supabaseApi.js` if needed.

## Debugging Connection Issues

1. **Check browser console** - Look for CORS errors or network errors
2. **Check Network tab** - See how long requests take
3. **Test with curl** - Verify server is reachable
4. **Check firewall** - Make sure outbound HTTPS is allowed
5. **Test from different network** - See if it's network-specific

