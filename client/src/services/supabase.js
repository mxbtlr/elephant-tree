import { createClient } from '@supabase/supabase-js';

// Safari-compatible storage adapter
// Safari's ITP (Intelligent Tracking Prevention) can block localStorage access
// This adapter provides fallback mechanisms for Safari
function createSafariCompatibleStorage() {
  const isSafari = typeof window !== 'undefined' && /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
  
  // Try localStorage first
  let storage = null;
  let storageAvailable = false;
  
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const testKey = '__safari_test__';
      window.localStorage.setItem(testKey, 'test');
      const result = window.localStorage.getItem(testKey);
      window.localStorage.removeItem(testKey);
      if (result === 'test') {
        storage = window.localStorage;
        storageAvailable = true;
      }
    }
  } catch (e) {
    console.warn('⚠️ localStorage test failed, will use fallback:', e.message);
  }
  
  // Fallback storage using in-memory object if localStorage fails
  // Note: This is session-only and won't persist across page reloads
  const memoryStorage = {};
  
  // For Safari, also try sessionStorage as a fallback
  let sessionStorageAvailable = false;
  let sessionStorageFallback = null;
  if (!storageAvailable && typeof window !== 'undefined' && window.sessionStorage) {
    try {
      const testKey = '__session_test__';
      window.sessionStorage.setItem(testKey, 'test');
      const result = window.sessionStorage.getItem(testKey);
      window.sessionStorage.removeItem(testKey);
      if (result === 'test') {
        sessionStorageFallback = window.sessionStorage;
        sessionStorageAvailable = true;
        console.log('✅ Using sessionStorage as fallback for Safari');
      }
    } catch (e) {
      console.warn('⚠️ sessionStorage also not available');
    }
  }
  
  return {
    getItem: (key) => {
      try {
        if (storageAvailable && storage) {
          return storage.getItem(key);
        }
        if (sessionStorageAvailable && sessionStorage) {
          return sessionStorage.getItem(key);
        }
        return memoryStorage[key] || null;
      } catch (e) {
        console.warn('Storage getItem error:', e);
        // Try fallbacks
        if (sessionStorageAvailable && sessionStorageFallback) {
          try {
            return sessionStorageFallback.getItem(key);
          } catch (e2) {
            // ignore
          }
        }
        return memoryStorage[key] || null;
      }
    },
    setItem: (key, value) => {
      try {
        if (storageAvailable && storage) {
          storage.setItem(key, value);
          return;
        }
        if (sessionStorageAvailable && sessionStorageFallback) {
          sessionStorageFallback.setItem(key, value);
          if (isSafari) {
            console.log('🌐 Safari: Using sessionStorage for auth token (session-only)');
          }
          return;
        }
        memoryStorage[key] = value;
        if (isSafari) {
          console.warn('⚠️ Safari: Using in-memory storage (will be lost on page reload)');
        }
      } catch (e) {
        console.warn('Storage setItem error:', e);
        // Try sessionStorage fallback
        if (sessionStorageAvailable && sessionStorageFallback) {
          try {
            sessionStorageFallback.setItem(key, value);
            return;
          } catch (e2) {
            // ignore
          }
        }
        memoryStorage[key] = value;
      }
    },
    removeItem: (key) => {
      try {
        if (storageAvailable && storage) {
          storage.removeItem(key);
          return;
        }
        if (sessionStorageAvailable && sessionStorageFallback) {
          sessionStorageFallback.removeItem(key);
          return;
        }
        delete memoryStorage[key];
      } catch (e) {
        console.warn('Storage removeItem error:', e);
        // Try fallbacks
        if (sessionStorageAvailable && sessionStorageFallback) {
          try {
            sessionStorageFallback.removeItem(key);
            return;
          } catch (e2) {
            // ignore
          }
        }
        delete memoryStorage[key];
      }
    }
  };
}

// Support both build-time and runtime configuration
// For production builds, environment variables may not be available at runtime
// So we allow configuration via window.__ENV__ or window.env
function getConfigValue(key, defaultValue = null) {
  // First try process.env (works during development/build)
  if (process.env[key]) {
    return process.env[key];
  }
  
  // Then try window.__ENV__ (common pattern for runtime config)
  if (typeof window !== 'undefined' && window.__ENV__ && window.__ENV__[key]) {
    return window.__ENV__[key];
  }
  
  // Then try window.env (alternative runtime config pattern)
  if (typeof window !== 'undefined' && window.env && window.env[key]) {
    return window.env[key];
  }
  
  // Finally try direct window properties (for simple runtime injection)
  if (typeof window !== 'undefined' && window[key]) {
    return window[key];
  }
  
  return defaultValue;
}

const supabaseUrl = getConfigValue('REACT_APP_SUPABASE_URL');
const supabaseAnonKey = getConfigValue('REACT_APP_SUPABASE_ANON_KEY');

// Provide detailed error message if config is missing
if (!supabaseUrl || !supabaseAnonKey) {
  const errorMsg = `
❌ Missing Supabase configuration!

Environment variables not found:
${!supabaseUrl ? '  - REACT_APP_SUPABASE_URL is missing\n' : ''}${!supabaseAnonKey ? '  - REACT_APP_SUPABASE_ANON_KEY is missing\n' : ''}
For development:
  Create client/.env file with:
    REACT_APP_SUPABASE_URL=your_supabase_url
    REACT_APP_SUPABASE_ANON_KEY=your_anon_key

For production build:
  Option 1: Rebuild with environment variables set
  Option 2: Inject config via window.__ENV__ before app loads:
    <script>
      window.__ENV__ = {
        REACT_APP_SUPABASE_URL: 'your_supabase_url',
        REACT_APP_SUPABASE_ANON_KEY: 'your_anon_key'
      };
    </script>
`;
  console.error(errorMsg);
  throw new Error('Missing Supabase environment variables. Check console for details.');
}

// Log the URL being used (for debugging)
console.log('✅ Supabase URL configured:', supabaseUrl);

// Ensure URL uses HTTPS and doesn't contain IP addresses
if (supabaseUrl.includes('http://') && !supabaseUrl.includes('localhost')) {
  console.warn('⚠️ Supabase URL is using HTTP instead of HTTPS:', supabaseUrl);
}

if (/\d+\.\d+\.\d+\.\d+/.test(supabaseUrl)) {
  console.error('❌ Supabase URL contains an IP address! It should use a domain name:', supabaseUrl);
}

// Create Safari-compatible storage
const compatibleStorage = typeof window !== 'undefined' ? createSafariCompatibleStorage() : null;

// Detect Safari for special handling
const isSafari = typeof window !== 'undefined' && /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
if (isSafari) {
  console.log('🌐 Safari detected - using compatible storage adapter');
}

const REQUEST_TIMEOUT_MS = 120000;
const SLOW_REQUEST_THRESHOLD_MS = 5000;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false, // Disable for self-hosted to avoid issues
    storage: compatibleStorage || (typeof window !== 'undefined' ? window.localStorage : null),
    // For self-hosted instances, use password flow (no PKCE)
    flowType: 'password',
    storageKey: 'supabase.auth.token',
    // Safari-specific: ensure storage events work properly
    debug: isSafari,
    // Safari: Use more permissive cookie settings if possible
    ...(isSafari && {
      // Force new session on Safari if localStorage is blocked
      persistSession: true
    })
  },
  db: {
    schema: 'public'
  },
  global: {
    headers: {
      'x-client-info': 'treeflow@1.0.0',
      'Connection': 'keep-alive' // Reuse connections
    },
    // Add fetch options for better timeout handling and performance
    fetch: (url, options = {}) => {
      // Add timeout to fetch requests - increased to 60 seconds for slow connections
      const controller = new AbortController();
      const startTime = Date.now();
      const timeoutId = setTimeout(() => {
        console.warn(`Request timeout after ${REQUEST_TIMEOUT_MS / 1000}s: ${url}`);
        controller.abort();
      }, REQUEST_TIMEOUT_MS);
      
      return fetch(url, {
        ...options,
        signal: controller.signal,
        // Avoid keepalive on some proxies that stall connections
        keepalive: false,
        // Avoid cache-related stalls on auth requests
        cache: 'no-store'
      })
      .catch(error => {
        if (error.name === 'AbortError') {
          throw new Error(`Request to ${url} timed out after ${REQUEST_TIMEOUT_MS / 1000} seconds. Please check your connection.`);
        }
        throw error;
      })
      .finally(() => {
        const duration = Date.now() - startTime;
        if (duration > SLOW_REQUEST_THRESHOLD_MS) {
          console.warn(`Slow request (${duration}ms): ${url}`);
        }
        clearTimeout(timeoutId);
      });
    }
  },
  // Disable realtime for self-hosted if not needed
  realtime: {
    params: {
      eventsPerSecond: 10
    }
  }
});

// Helper function to get current user with profile
export async function getCurrentUserWithProfile() {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      console.warn('No auth user:', authError);
      return null;
    }

    // Add timeout to profile query
    const profilePromise = supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Profile query timeout')), 3000)
    );

    const { data: profile, error: profileError } = await Promise.race([
      profilePromise,
      timeoutPromise
    ]);

    if (profileError) {
      console.warn('Error fetching profile (non-fatal):', profileError);
      // Return user without profile if profile doesn't exist
      return {
        ...user,
        profile: {
          id: user.id,
          email: user.email,
          name: user.user_metadata?.name || user.email,
          role: 'user'
        }
      };
    }

    return {
      ...user,
      profile
    };
  } catch (error) {
    console.error('Exception in getCurrentUserWithProfile:', error);
    // Try to at least return the auth user
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        return {
          ...user,
          profile: {
            id: user.id,
            email: user.email,
            name: user.user_metadata?.name || user.email,
            role: 'user'
          }
        };
      }
    } catch (fallbackError) {
      console.error('Fallback also failed:', fallbackError);
    }
    return null;
  }
}

// Helper function to check if user is admin
export async function isAdmin(userId) {
  const { data, error } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .single();

  if (error || !data) return false;
  return data.role === 'admin';
}

// Helper function to get user's team memberships
export async function getUserTeamMemberships(userId) {
  const { data, error } = await supabase
    .from('team_memberships')
    .select(`
      *,
      team:teams(*)
    `)
    .eq('user_id', userId);

  if (error) {
    console.error('Error fetching team memberships:', error);
    return [];
  }

  return data || [];
}

// Helper function to get user's role in a team
export async function getUserTeamRole(userId, teamId) {
  const { data, error } = await supabase
    .from('team_memberships')
    .select('role')
    .eq('user_id', userId)
    .eq('team_id', teamId)
    .single();

  if (error || !data) return null;
  return data.role;
}

export default supabase;

