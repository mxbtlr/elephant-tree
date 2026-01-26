#!/usr/bin/env node

/**
 * Script to inject environment variables into the built index.html
 * This allows runtime configuration without rebuilding
 */

const fs = require('fs');
const path = require('path');

// Path to built index.html
const buildIndexPath = path.join(__dirname, '..', 'build', 'index.html');

// Path to .env file
const envPath = path.join(__dirname, '..', '.env');

// Read .env file
let supabaseUrl = null;
let supabaseKey = null;

if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  const lines = envContent.split('\n');
  
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('REACT_APP_SUPABASE_URL=')) {
      supabaseUrl = trimmed.substring('REACT_APP_SUPABASE_URL='.length).trim();
      // Remove quotes if present
      supabaseUrl = supabaseUrl.replace(/^["']|["']$/g, '');
    } else if (trimmed.startsWith('REACT_APP_SUPABASE_ANON_KEY=')) {
      supabaseKey = trimmed.substring('REACT_APP_SUPABASE_ANON_KEY='.length).trim();
      // Remove quotes if present
      supabaseKey = supabaseKey.replace(/^["']|["']$/g, '');
    }
  }
}

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Error: Could not find Supabase configuration in .env file');
  console.error('Make sure client/.env contains:');
  console.error('  REACT_APP_SUPABASE_URL=...');
  console.error('  REACT_APP_SUPABASE_ANON_KEY=...');
  process.exit(1);
}

// Check if build/index.html exists
if (!fs.existsSync(buildIndexPath)) {
  console.error('❌ Error: build/index.html not found');
  console.error('Please run "npm run build" first');
  process.exit(1);
}

// Read the built index.html
let htmlContent = fs.readFileSync(buildIndexPath, 'utf8');

// Check if config is already injected
if (htmlContent.includes('window.__ENV__') && htmlContent.includes(supabaseUrl)) {
  console.log('✅ Configuration already present in build/index.html');
  process.exit(0);
}

// Inject configuration script before the closing </head> tag
const configScript = `
    <script>
      // Injected configuration from .env file
      if (!window.__ENV__) window.__ENV__ = {};
      window.__ENV__.REACT_APP_SUPABASE_URL = '${supabaseUrl.replace(/'/g, "\\'")}';
      window.__ENV__.REACT_APP_SUPABASE_ANON_KEY = '${supabaseKey.replace(/'/g, "\\'")}';
    </script>`;

// Try to find </head> and inject before it
if (htmlContent.includes('</head>')) {
  htmlContent = htmlContent.replace('</head>', configScript + '\n</head>');
} else if (htmlContent.includes('</head>')) {
  htmlContent = htmlContent.replace('</head>', configScript + '\n</head>');
} else {
  // If no </head> found, inject before </body>
  htmlContent = htmlContent.replace('</body>', configScript + '\n</body>');
}

// Write back to file
fs.writeFileSync(buildIndexPath, htmlContent, 'utf8');

console.log('✅ Successfully injected environment variables into build/index.html');
console.log(`   URL: ${supabaseUrl}`);
console.log(`   Key: ${supabaseKey.substring(0, 20)}...`);
console.log('\n💡 You can now serve the build without rebuilding!');
