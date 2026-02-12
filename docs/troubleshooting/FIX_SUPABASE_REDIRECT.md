# Fix Supabase Redirect to IP Address

## Problem
Your browser is showing requests to `http://87.106.6.59:8000/auth/v1/token` instead of `https://api.maxbeitler.com/auth/v1/token`, even though your client is configured with the domain name.

## Root Cause
The Supabase server itself is redirecting from the domain to the IP address. This is a **server-side configuration issue**, not a client-side problem.

## Solution: Configure Supabase Server

You need to update your Supabase instance configuration to use the domain name instead of the IP address.

### 1. Update Supabase Environment Variables

On your Supabase server, update these environment variables:

```bash
# In your Supabase .env file or docker-compose.yml
SITE_URL=https://api.maxbeitler.com
API_EXTERNAL_URL=https://api.maxbeitler.com
SUPABASE_PUBLIC_URL=https://api.maxbeitler.com
```

### 2. Update Kong/API Gateway Configuration

If you're using Kong as the API gateway (default in self-hosted Supabase), ensure it's configured to use the domain:

```bash
# In your Supabase configuration
KONG_HTTP_PORT=8000
KONG_HTTPS_PORT=8443
```

And ensure your reverse proxy (nginx/apache) is forwarding to the domain, not the IP.

### 3. Update Nginx/Reverse Proxy Configuration

If you have a reverse proxy in front of Supabase, ensure it's configured correctly:

```nginx
server {
    listen 443 ssl;
    server_name api.maxbeitler.com;
    
    location / {
        proxy_pass http://localhost:8000;  # Or your Supabase internal URL
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### 4. Restart Supabase Services

After making changes, restart your Supabase instance:

```bash
# If using Docker Compose
docker-compose restart

# Or restart specific services
docker-compose restart kong postgrest
```

### 5. Verify Configuration

After restarting, check that:
1. `https://api.maxbeitler.com` resolves correctly
2. No redirects to IP addresses occur
3. All requests use HTTPS (not HTTP)

## Client-Side Verification

The client is already correctly configured. You can verify by checking the browser console - you should see:
```
Supabase URL configured: https://api.maxbeitler.com
```

If you see any warnings about IP addresses or HTTP, the client configuration needs to be fixed.

## Testing

After fixing the server configuration:
1. Clear your browser cache
2. Hard refresh (Ctrl+Shift+R or Cmd+Shift+R)
3. Check the Network tab in browser DevTools
4. Verify all requests go to `https://api.maxbeitler.com` (not the IP address)

## Additional Notes

- The redirect from domain to IP is happening at the **server level**, not in the client code
- The Supabase client library follows redirects automatically, which is why you see the IP address in the browser
- This is a common issue with self-hosted Supabase instances that weren't initially configured with a domain name

