/**
 * Test script to verify Supabase connection
 * Run with: node scripts/test-supabase-connection.js
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Try to load .env file manually (since dotenv might not be installed)
let supabaseUrl, supabaseKey;
try {
  const envPath = path.join(__dirname, '../.env');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    envContent.split('\n').forEach(line => {
      const match = line.match(/^REACT_APP_SUPABASE_(URL|ANON_KEY)=(.*)$/);
      if (match) {
        if (match[1] === 'URL') {
          supabaseUrl = match[2].trim();
        } else {
          supabaseKey = match[2].trim();
        }
      }
    });
  }
} catch (e) {
  console.log('Could not read .env file, trying environment variables...');
}

// Fall back to environment variables if not found in .env
if (!supabaseUrl) supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
if (!supabaseKey) supabaseKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing environment variables!');
  console.error('Make sure client/.env exists with:');
  console.error('REACT_APP_SUPABASE_URL=...');
  console.error('REACT_APP_SUPABASE_ANON_KEY=...');
  process.exit(1);
}

console.log('🔗 Testing Supabase connection...');
console.log('URL:', supabaseUrl);
console.log('Key:', supabaseKey.substring(0, 20) + '...');

const supabase = createClient(supabaseUrl, supabaseKey);

async function testConnection() {
  try {
    // Test 1: Basic connection
    console.log('\n1️⃣ Testing basic connection...');
    const { data, error } = await supabase.from('profiles').select('count');
    
    if (error) {
      if (error.code === 'PGRST116') {
        console.log('⚠️  Table "profiles" does not exist. Run migrations first!');
        console.log('   See: supabase/migrations/001_initial_schema.sql');
      } else {
        console.error('❌ Connection error:', error.message);
        console.error('   Code:', error.code);
        console.error('   Details:', error.details);
      }
      return false;
    }
    
    console.log('✅ Connection successful!');
    
    // Test 2: Check if migrations have been run
    console.log('\n2️⃣ Checking database schema...');
    const tables = ['profiles', 'teams', 'outcomes', 'opportunities', 'solutions', 'tests', 'kpis'];
    const missingTables = [];
    
    for (const table of tables) {
      const { error: tableError } = await supabase.from(table).select('count').limit(1);
      if (tableError && tableError.code === 'PGRST116') {
        missingTables.push(table);
      }
    }
    
    if (missingTables.length > 0) {
      console.log('⚠️  Missing tables:', missingTables.join(', '));
      console.log('   Run migrations: supabase/migrations/*.sql');
    } else {
      console.log('✅ All required tables exist!');
    }
    
    // Test 3: Check RLS
    console.log('\n3️⃣ Checking Row Level Security...');
    const { data: rlsData, error: rlsError } = await supabase
      .rpc('is_admin', { user_id: '00000000-0000-0000-0000-000000000000' });
    
    if (rlsError && rlsError.code === '42883') {
      console.log('⚠️  RLS helper functions not found. Run migration 002_row_level_security.sql');
    } else {
      console.log('✅ RLS functions exist!');
    }
    
    // Test 4: Test authentication endpoint
    console.log('\n4️⃣ Testing authentication endpoint...');
    const { data: authData, error: authError } = await supabase.auth.getSession();
    
    if (authError) {
      console.log('⚠️  Auth endpoint error:', authError.message);
    } else {
      console.log('✅ Authentication endpoint accessible!');
    }
    
    console.log('\n✅ All tests completed!');
    console.log('\n📝 Next steps:');
    console.log('   1. Run migrations if tables are missing');
    console.log('   2. Configure authentication in Supabase Studio');
    console.log('   3. Create your first user');
    console.log('   4. Make a user admin: UPDATE profiles SET role = \'admin\' WHERE email = \'...\';');
    
    return true;
    
  } catch (error) {
    console.error('❌ Unexpected error:', error);
    return false;
  }
}

testConnection().then(success => {
  process.exit(success ? 0 : 1);
});

