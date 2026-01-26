# Check Connection to Supabase Server

If you're getting "connection to server is slow or unreachable" errors, follow these steps:

## Quick Test

### 1. Test Basic Connectivity
```bash
curl -I https://api.maxbeitler.com
```

Expected: Should return HTTP status (200, 401, 403, etc.)

### 2. Test Auth Endpoint
```bash
curl -X POST https://api.maxbeitler.com/auth/v1/token \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"test"}' \
  -w "\nTime: %{time_total}s\n"
```

Expected: Should return 401 (unauthorized) quickly (< 5 seconds)

### 3. Check DNS Resolution
```bash
nslookup api.maxbeitler.com
# or
dig api.maxbeitler.com
```

Expected: Should resolve to an IP address

### 4. Check Network Speed
```bash
ping -c 5 api.maxbeitler.com
```

Expected: Should show response times < 200ms

## Common Issues

### Issue 1: Network Firewall
Your network might be blocking outbound HTTPS connections.

**Solution:**
- Check if you're on a corporate network with firewall
- Try from a different network (mobile hotspot, home network)
- Contact network administrator

### Issue 2: DNS Issues
DNS might not be resolving correctly.

**Solution:**
- Try using IP address directly (if you know it)
- Check DNS settings
- Try different DNS server (8.8.8.8, 1.1.1.1)

### Issue 3: Server is Down
The server might actually be unreachable.

**Solution:**
- Check server status
- Try accessing from a different location
- Contact server administrator

### Issue 4: SSL/TLS Issues
Certificate problems can cause slow connections.

**Solution:**
- Check certificate validity: `openssl s_client -connect api.maxbeitler.com:443`
- Ensure system clock is correct
- Check for certificate warnings in browser

## Browser Console Debugging

Open browser DevTools (F12) and check:

1. **Network Tab:**
   - Look for failed requests (red)
   - Check request timing
   - Look for CORS errors

2. **Console Tab:**
   - Look for error messages
   - Check for timeout messages
   - Look for connection errors

3. **Application Tab:**
   - Check if session is stored
   - Check localStorage for Supabase tokens

## Temporary Workaround

If the server is consistently slow, you can:

1. **Increase timeouts** (already done - now 20 seconds)
2. **Use local Supabase** for development (see LOCAL_DEVELOPMENT_SETUP.md)
3. **Use SSH tunnel** if server is behind firewall
4. **Check server logs** for performance issues

## Test Connection from Browser

Open browser console and run:

```javascript
// Test basic connectivity
fetch('https://api.maxbeitler.com/auth/v1/health', {
  method: 'GET',
  headers: {
    'apikey': 'YOUR_ANON_KEY'
  }
})
.then(r => {
  console.log('Status:', r.status);
  console.log('Time:', performance.now());
  return r.json();
})
.then(console.log)
.catch(err => {
  console.error('Error:', err);
  console.error('Time:', performance.now());
});
```

This will show you:
- If the server is reachable
- How long it takes to respond
- Any CORS or other errors

