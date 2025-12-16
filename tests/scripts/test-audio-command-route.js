/**
 * Test script to verify audio command route is accessible
 * Run with: node tests/scripts/test-audio-command-route.js
 */

import http from 'http';

const testUrl = 'http://localhost:3000/api/audio-commands';

console.log('🧪 Testing Audio Command Route...\n');

// Test 1: Check if route exists (should return 401 without auth, not 404)
console.log('Test 1: Checking if route exists...');
const test1 = new Promise((resolve) => {
  http.get(testUrl, (res) => {
    const statusCode = res.statusCode;
    console.log(`   Status: ${statusCode}`);
    
    if (statusCode === 404) {
      console.log('   ❌ FAILED: Route returns 404 (route not found)');
      resolve(false);
    } else if (statusCode === 401 || statusCode === 302) {
      console.log(`   ✅ PASSED: Route exists (${statusCode} = requires authentication/redirect)`);
      resolve(true);
    } else {
      console.log(`   ⚠️  UNEXPECTED: Got status ${statusCode}`);
      resolve(statusCode !== 404);
    }
  }).on('error', (err) => {
    console.log(`   ❌ FAILED: ${err.message}`);
    console.log('   Make sure the server is running on port 3000');
    resolve(false);
  });
});

// Test 2: Check POST endpoint
console.log('\nTest 2: Testing POST endpoint...');
const test2 = new Promise((resolve) => {
  const postData = JSON.stringify({ command: '!test' });
  
  const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/api/audio-commands',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(postData)
    }
  };

  const req = http.request(options, (res) => {
    const statusCode = res.statusCode;
    console.log(`   Status: ${statusCode}`);
    
    if (statusCode === 404) {
      console.log('   ❌ FAILED: POST route returns 404');
      resolve(false);
    } else if (statusCode === 401 || statusCode === 400 || statusCode === 302) {
      console.log(`   ✅ PASSED: POST route exists (${statusCode} = expected response without auth/data)`);
      resolve(true);
    } else {
      console.log(`   ⚠️  UNEXPECTED: Got status ${statusCode}`);
      resolve(statusCode !== 404);
    }
  });

  req.on('error', (err) => {
    console.log(`   ❌ FAILED: ${err.message}`);
    resolve(false);
  });

  req.write(postData);
  req.end();
});

// Run all tests
Promise.all([test1, test2]).then((results) => {
  const allPassed = results.every(r => r === true);
  
  console.log('\n' + '='.repeat(50));
  if (allPassed) {
    console.log('✅ ALL TESTS PASSED - Route is accessible!');
    console.log('\nIf you still get errors in the browser:');
    console.log('1. Hard refresh (Ctrl+F5)');
    console.log('2. Check browser console for CORS/credentials issues');
    console.log('3. Verify session is valid (try logging out and back in)');
  } else {
    console.log('❌ SOME TESTS FAILED - Route may not be accessible');
    console.log('\nTroubleshooting:');
    console.log('1. Make sure server is running: npm start');
    console.log('2. Check server.js has API routes before static files');
    console.log('3. Verify routes/audioCommands.js exists and exports router');
  }
  console.log('='.repeat(50));
  
  process.exit(allPassed ? 0 : 1);
});

