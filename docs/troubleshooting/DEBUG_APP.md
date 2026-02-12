# Debugging Application Loading Issues

If the application is not loading, check these:

## 1. Check Browser Console

Open browser Developer Tools (F12) and check the Console tab for errors.

Common errors:
- **Supabase connection errors**: Check `.env` file
- **Module not found**: Run `npm install` in client directory
- **Syntax errors**: Check for JavaScript errors

## 2. Check Network Tab

In Developer Tools → Network tab:
- Look for failed requests (red)
- Check if Supabase requests are failing
- Verify CORS is not blocking requests

## 3. Check Terminal/Console

Look at the terminal where `npm start` is running:
- Check for compilation errors
- Look for warnings
- Verify the build completed

## 4. Common Issues

### Issue: Blank White Screen

**Possible causes:**
- JavaScript error preventing render
- Supabase connection failing
- Missing environment variables

**Fix:**
1. Check browser console
2. Verify `.env` file exists and has correct values
3. Check if Supabase is accessible

### Issue: "Loading..." Forever

**Possible causes:**
- `getCurrentUser()` failing
- Session check hanging
- Database connection issues

**Fix:**
1. Check browser console for errors
2. Verify user is logged in
3. Check Supabase connection

### Issue: Module Not Found

**Fix:**
```bash
cd client
rm -rf node_modules package-lock.json
npm install
```

### Issue: Supabase Connection Errors

**Fix:**
1. Verify `.env` file has correct URL and key
2. Test connection: `npm run test-supabase`
3. Check if Supabase instance is running

## 5. Quick Reset

If nothing works:

```bash
# Stop the server (Ctrl+C)
# Clear cache and reinstall
cd client
rm -rf node_modules package-lock.json .cache
npm install
npm start
```

## 6. Check Specific Errors

Share the exact error message from:
- Browser console
- Terminal output
- Network tab (failed requests)

This will help identify the specific issue.

