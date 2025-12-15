/**
 * Quick test script for OBS Source route
 * Run with: node scripts/test-obs-source.js
 * 
 * This tests the OBS source route without requiring the full server to be running
 */

import http from 'http';

const BASE_URL = 'http://localhost:3000';

console.log('🧪 Testing OBS Source Route...\n');

const tests = [];

// Test 1: Missing token
tests.push(new Promise((resolve) => {
  console.log('Test 1: Missing token (should return 400)...');
  http.get(`${BASE_URL}/obs-source`, (res) => {
    let data = '';
    res.on('data', (chunk) => { data += chunk; });
    res.on('end', () => {
      if (res.statusCode === 400 && data.includes('Error: Missing Token')) {
        console.log('   ✅ PASSED: Returns 400 with error message');
        resolve(true);
      } else {
        console.log(`   ❌ FAILED: Expected 400 with error message, got ${res.statusCode}`);
        resolve(false);
      }
    });
  }).on('error', (err) => {
    console.log(`   ❌ FAILED: ${err.message}`);
    console.log('   Make sure the server is running: npm start');
    resolve(false);
  });
}));

// Test 2: Valid token
tests.push(new Promise((resolve) => {
  console.log('\nTest 2: Valid token (should return 200)...');
  const testToken = 'test-token-123';
  http.get(`${BASE_URL}/obs-source?token=${testToken}`, (res) => {
    let data = '';
    res.on('data', (chunk) => { data += chunk; });
    res.on('end', () => {
      if (res.statusCode === 200 && 
          data.includes('MultiBot OBS Browser Source') &&
          data.includes(testToken) &&
          !data.includes('{{TOKEN}}')) {
        console.log('   ✅ PASSED: Returns 200 with OBS source HTML');
        resolve(true);
      } else {
        console.log(`   ❌ FAILED: Expected 200 with valid HTML, got ${res.statusCode}`);
        if (data.includes('{{TOKEN}}')) {
          console.log('   ⚠️  Token placeholder not replaced!');
        }
        resolve(false);
      }
    });
  }).on('error', (err) => {
    console.log(`   ❌ FAILED: ${err.message}`);
    resolve(false);
  });
}));

// Test 3: Token with special characters
tests.push(new Promise((resolve) => {
  console.log('\nTest 3: Token with special characters (should handle correctly)...');
  const testToken = 'I8IXbqXZZB/U5QLF8=';
  const encodedToken = encodeURIComponent(testToken);
  http.get(`${BASE_URL}/obs-source?token=${encodedToken}`, (res) => {
    let data = '';
    res.on('data', (chunk) => { data += chunk; });
    res.on('end', () => {
      if (res.statusCode === 200 && data.includes(testToken)) {
        console.log('   ✅ PASSED: Handles tokens with special characters');
        resolve(true);
      } else {
        console.log(`   ❌ FAILED: Expected 200 with token in HTML, got ${res.statusCode}`);
        resolve(false);
      }
    });
  }).on('error', (err) => {
    console.log(`   ❌ FAILED: ${err.message}`);
    resolve(false);
  });
}));

// Test 4: Empty token parameter
tests.push(new Promise((resolve) => {
  console.log('\nTest 4: Empty token parameter (should return 400)...');
  http.get(`${BASE_URL}/obs-source?token=`, (res) => {
    let data = '';
    res.on('data', (chunk) => { data += chunk; });
    res.on('end', () => {
      if (res.statusCode === 400 && data.includes('Error: Missing Token')) {
        console.log('   ✅ PASSED: Returns 400 for empty token');
        resolve(true);
      } else {
        console.log(`   ❌ FAILED: Expected 400, got ${res.statusCode}`);
        resolve(false);
      }
    });
  }).on('error', (err) => {
    console.log(`   ❌ FAILED: ${err.message}`);
    resolve(false);
  });
}));

// Test 5: Check for WebSocket code
tests.push(new Promise((resolve) => {
  console.log('\nTest 5: WebSocket connection code present...');
  const testToken = 'test-token';
  http.get(`${BASE_URL}/obs-source?token=${testToken}`, (res) => {
    let data = '';
    res.on('data', (chunk) => { data += chunk; });
    res.on('end', () => {
      if (data.includes('WebSocket') && data.includes('obs_authenticate')) {
        console.log('   ✅ PASSED: WebSocket code present');
        resolve(true);
      } else {
        console.log('   ❌ FAILED: WebSocket code missing');
        resolve(false);
      }
    });
  }).on('error', (err) => {
    console.log(`   ❌ FAILED: ${err.message}`);
    resolve(false);
  });
}));

// Run all tests
Promise.all(tests).then((results) => {
  const passed = results.filter(r => r === true).length;
  const total = results.length;
  
  console.log('\n' + '='.repeat(50));
  console.log(`Results: ${passed}/${total} tests passed`);
  
  if (passed === total) {
    console.log('✅ ALL TESTS PASSED!');
  } else {
    console.log('❌ SOME TESTS FAILED');
    console.log('\nTroubleshooting:');
    console.log('1. Make sure server is running: npm start');
    console.log('2. Check server logs for errors');
    console.log('3. Verify routes/obsSource.js is properly configured');
  }
  console.log('='.repeat(50));
  
  process.exit(passed === total ? 0 : 1);
});

