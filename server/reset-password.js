#!/usr/bin/env node

/**
 * Script to generate a password hash for manual password reset
 * Usage: node reset-password.js <password>
 */

const crypto = require('crypto');

if (process.argv.length < 3) {
  console.log('Usage: node reset-password.js <password>');
  console.log('Example: node reset-password.js mynewpassword123');
  process.exit(1);
}

const password = process.argv[2];
const hash = crypto.createHash('sha256').update(password).digest('hex');

console.log('\nPassword Hash:');
console.log(hash);
console.log('\nTo update the password in data.json:');
console.log('1. Open server/data.json');
console.log('2. Find the user with email "admin@example.com"');
console.log('3. Replace the "passwordHash" value with the hash above');
console.log('4. Also change "role" to "admin" if needed');
console.log('5. Save the file\n');





