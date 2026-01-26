# Performance Optimization Guide

## Current Issue
Connection between frontend and backend (`api.maxbeitler.com`) is too slow.

## Solutions

### Option 1: Use Local Supabase for Development (Recommended)

The best solution for development is to run Supabase locally. See `LOCAL_DEVELOPMENT_SETUP.md` for full instructions.

**Quick Setup:**
```bash
# Clone Supabase
git clone --depth 1 https://github.com/supabase/supabase
cd supabase/docker
cp .env.example .env
docker-compose up -d

# Update client/.env
REACT_APP_SUPABASE_URL=http://localhost:8000
REACT_APP_SUPABASE_ANON_KEY=your-local-key
```

**Benefits:**
- No network latency (localhost)
- Faster development
- No dependency on remote server
- Can work offline

### Option 2: Optimize Network Requests

#### A. Reduce Number of Requests
- Batch multiple queries into one
- Use Supabase's `.select()` with joins instead of multiple queries
- Cache frequently accessed data

#### B. Add Request Caching
Cache API responses in memory or localStorage to avoid repeated requests.

#### C. Use Connection Keep-Alive
Ensure HTTP connections are reused instead of creating new ones.

### Option 3: Optimize Database Queries

#### A. Add Indexes
Ensure database has proper indexes on frequently queried columns:
- `outcomes.owner`
- `outcomes.team_id`
- `outcomes.visibility`
- `opportunities.outcome_id`
- `solutions.opportunity_id`

#### B. Optimize SELECT Queries
Use specific column selection instead of `*`:
```sql
SELECT id, title, owner FROM outcomes
-- Instead of
SELECT * FROM outcomes
```

#### C. Add Pagination
For large datasets, implement pagination instead of loading everything at once.

### Option 4: Network-Level Optimizations

#### A. Use CDN
If possible, serve static assets through a CDN closer to your location.

#### B. Enable Compression
Ensure your server has gzip/brotli compression enabled.

#### C. Use HTTP/2
HTTP/2 allows multiplexing multiple requests over a single connection.

### Option 5: Frontend Optimizations

#### A. Lazy Loading
Load data only when needed, not all at once.

#### B. Debounce Search/Filter
If you have search or filter functionality, debounce the requests.

#### C. Optimistic Updates
Update UI immediately, then sync with server in background.

#### D. Service Worker Caching
Cache API responses using a service worker.

### Option 6: Check Network Speed

Test your actual connection speed:
```bash
# Test ping
ping -c 10 api.maxbeitler.com

# Test download speed
curl -o /dev/null -s -w "Time: %{time_total}s\nSpeed: %{speed_download} bytes/s\n" https://api.maxbeitler.com

# Test specific endpoint
time curl -X POST https://api.maxbeitler.com/auth/v1/token \
  -H "Content-Type: application/json" \
  -d '{"email":"test","password":"test"}'
```

If ping > 200ms or curl > 5s, consider:
- Using a VPN if server is geo-restricted
- Using a different network
- Using local Supabase for development

### Option 7: Server-Side Optimizations

If you control the server:
- Move server closer to your location
- Use a faster hosting provider
- Optimize database queries
- Add caching layer (Redis)
- Use connection pooling

## Quick Wins (Easy to Implement)

1. **Use Local Supabase** - Biggest impact, zero network latency
2. **Add Request Caching** - Cache outcomes/teams in memory
3. **Optimize Queries** - Use specific columns, add indexes
4. **Batch Requests** - Combine multiple queries where possible

## Recommended Approach

For **development**: Use local Supabase (Option 1)
For **production**: Optimize queries and add caching (Options 2-3)

