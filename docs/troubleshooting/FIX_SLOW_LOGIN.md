# Fix Slow Login Performance

## Problem
Login is taking 20+ seconds and timing out because:
1. `getCurrentUser()` is being called during login and timing out (5 second timeout)
2. `signInWithPassword` is timing out (20 second timeout)
3. Profile fetching is blocking the login flow

## What Was Fixed

### 1. Non-Blocking Profile Fetching
- **App.js**: `onAuthStateChange` now uses basic user from session immediately
- Profile fetching happens in background (non-blocking)
- Login completes immediately with basic user info

### 2. Optimized `getCurrentUser()`
- Returns basic auth user immediately (fast, no database query)
- Only tries to fetch profile as a background operation
- 2-second timeout for profile query (instead of blocking)
- Falls back to basic user if profile query fails or times out

### 3. Increased Timeouts
- Login timeout increased from 20s to 30s
- Fetch timeout increased from 20s to 30s
- Profile query timeout set to 2s (non-blocking)

## How It Works Now

### Before (Slow):
1. User submits login
2. `signInWithPassword` completes
3. `onAuthStateChange` triggers
4. `getCurrentUser()` called → tries to fetch profile
5. Profile query times out after 5 seconds
6. Login finally completes after ~20+ seconds

### After (Fast):
1. User submits login
2. `signInWithPassword` completes
3. `onAuthStateChange` triggers
4. Basic user created from session immediately
5. App loads immediately with basic user
6. Profile fetched in background (non-blocking)
7. User updated if profile loads successfully

## Expected Performance

- **Login completion**: < 1 second (just authentication)
- **App ready**: Immediately after login
- **Profile loading**: Background operation, doesn't block UI

## What You'll See

### Console Messages:
- `Starting login for: ...`
- `Sign in completed in Xms` (should be < 1000ms)
- `Login successful, session created (total: Xms)` (should be < 2000ms)
- `Profile loaded successfully` (may appear later, non-blocking)

### User Experience:
- Login form closes immediately after successful authentication
- App loads right away
- User info shows basic details (name from user_metadata)
- Profile details update in background if available

## If Login Is Still Slow

1. **Check network connection** to Supabase server
2. **Check browser console** for slow requests
3. **Verify Supabase server** is accessible and responsive
4. **Check for CORS issues** that might be causing delays

## Technical Details

### Changed Files:
- `client/src/App.js`: Optimized `onAuthStateChange` handler
- `client/src/services/supabaseApi.js`: Optimized `getCurrentUser()` and login timeout
- `client/src/services/supabase.js`: Increased fetch timeout

### Key Changes:
- `getCurrentUser()` now returns immediately with auth user
- Profile query is non-blocking with 2s timeout
- Login timeout increased to 30s
- All fetch requests timeout increased to 30s
