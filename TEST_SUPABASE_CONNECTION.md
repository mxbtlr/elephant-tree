# Testing Supabase Connection from Localhost

## Issue
Login is slow or timing out when trying to connect to `api.maxbeitler.com` from localhost.

## Quick Tests

### 1. Test Basic Connectivity
```bash
curl -I https://api.maxbeitler.com
```

### 2. Test Auth Endpoint
```bash
curl -X POST https://api.maxbeitler.com/auth/v1/token \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"test"}'
```

### 3. Test from Browser Console
Open browser DevTools (F12) and run:
```javascript
fetch('https://api.maxbeitler.com/auth/v1/health', {
  method: 'GET',
  headers: {
    'apikey': 'YOUR_ANON_KEY'
  }
})
.then(r => r.json())
.then(console.log)
.catch(console.error);
```

## Common Issues

### 1. CORS (Cross-Origin Resource Sharing)
If you see CORS errors in the browser console, the Supabase server needs to allow requests from `http://localhost:3000`.

**Fix:** Update your Supabase/Kong configuration to allow localhost origins.

### 2. Network/Firewall
Your local network might be blocking outbound connections to the server.

**Fix:** Check firewall settings or use a VPN if needed.

### 3. SSL/TLS Issues
Self-signed certificates or certificate issues can cause slow connections.

**Fix:** Ensure your SSL certificate is valid and trusted.

### 4. Server Location
If the server is far away, network latency can cause slow responses.

**Fix:** Consider using a local development Supabase instance or a closer server.

## Solutions

### Option 1: Use Local Supabase for Development
Run Supabase locally using Docker:
```bash
git clone --depth 1 https://github.com/supabase/supabase
cd supabase/docker
cp .env.example .env
docker-compose up
```

### Option 2: Configure CORS on Server
Add localhost to allowed origins in your Supabase/Kong configuration.

### Option 3: Use SSH Tunnel
If the server is only accessible from certain networks, use an SSH tunnel:
```bash
ssh -L 8000:localhost:8000 user@your-server
```

Then use `http://localhost:8000` in your `.env` file.

### Option 4: Check Network Speed
Test the actual connection speed:
```bash
time curl -X POST https://api.maxbeitler.com/auth/v1/token \
  -H "Content-Type: application/json" \
  -d '{"email":"test","password":"test"}'
```

## Debugging Steps

1. Check browser console for errors
2. Check Network tab in DevTools to see request timing
3. Check if requests are being blocked or timing out
4. Verify the Supabase URL is correct in `.env`
5. Test with a simple curl command first

