/**
 * Pre-deployment check script
 * Run this before deploying to production to catch regressions
 * Usage: node scripts/pre-deployment-check.js
 */

import { execSync } from 'child_process';
import { readFileSync } from 'fs';

console.log('🚀 Pre-Deployment Check\n');
console.log('='.repeat(60));

const checks = [];
let allPassed = true;

// 1. Check if server is running
console.log('\n1️⃣  Checking if server is running...');
try {
  const response = await fetch('http://localhost:3000');
  if (response.ok) {
    console.log('   ✅ Server is running');
    checks.push({ name: 'Server Running', status: 'pass' });
  } else {
    throw new Error('Server returned non-200 status');
  }
} catch (error) {
  console.log('   ⚠️  Server not running - some tests will be skipped');
  console.log('   💡 Start server with: npm start');
  checks.push({ name: 'Server Running', status: 'skip' });
}

// 2. Run integration tests
console.log('\n2️⃣  Running OBS Source integration tests...');
try {
  execSync('node scripts/test-obs-source-flow.js', { stdio: 'inherit' });
  console.log('   ✅ Integration tests passed');
  checks.push({ name: 'Integration Tests', status: 'pass' });
} catch (error) {
  console.log('   ❌ Integration tests failed');
  checks.push({ name: 'Integration Tests', status: 'fail' });
  allPassed = false;
}

// 3. Check database connection
console.log('\n3️⃣  Checking database connection...');
try {
  const { default: pool } = await import('../config/database.js');
  await pool.query('SELECT 1');
  await pool.end();
  console.log('   ✅ Database connection works');
  checks.push({ name: 'Database Connection', status: 'pass' });
} catch (error) {
  console.log('   ❌ Database connection failed:', error.message);
  checks.push({ name: 'Database Connection', status: 'fail' });
  allPassed = false;
}

// 4. Check critical files exist
console.log('\n4️⃣  Checking critical files...');
const criticalFiles = [
  'server.js',
  'routes/obsSource.js',
  'models/obsToken.js',
  'controllers/obsTokenController.js',
  'public/obs-source.html'
];

let missingFiles = [];
for (const file of criticalFiles) {
  try {
    readFileSync(file);
  } catch (error) {
    missingFiles.push(file);
  }
}

if (missingFiles.length === 0) {
  console.log('   ✅ All critical files exist');
  checks.push({ name: 'Critical Files', status: 'pass' });
} else {
  console.log('   ❌ Missing files:', missingFiles.join(', '));
  checks.push({ name: 'Critical Files', status: 'fail' });
  allPassed = false;
}

// 5. Check environment variables
console.log('\n5️⃣  Checking environment variables...');
const requiredEnvVars = ['DATABASE_URL'];
const missingEnvVars = requiredEnvVars.filter(env => !process.env[env]);

if (missingEnvVars.length === 0) {
  console.log('   ✅ Required environment variables set');
  checks.push({ name: 'Environment Variables', status: 'pass' });
} else {
  console.log('   ⚠️  Missing environment variables:', missingEnvVars.join(', '));
  checks.push({ name: 'Environment Variables', status: 'warn' });
}

// Summary
console.log('\n' + '='.repeat(60));
console.log('📊 Pre-Deployment Check Summary:\n');

checks.forEach(check => {
  const icon = check.status === 'pass' ? '✅' : check.status === 'fail' ? '❌' : '⚠️';
  console.log(`   ${icon} ${check.name}: ${check.status}`);
});

console.log('\n' + '='.repeat(60));

if (allPassed) {
  console.log('\n✅ All checks passed! Ready for deployment.');
  process.exit(0);
} else {
  console.log('\n❌ Some checks failed. Please fix issues before deploying.');
  process.exit(1);
}

