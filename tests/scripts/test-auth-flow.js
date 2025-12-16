/**
 * Test script to verify authentication flow
 * Run with: node tests/scripts/test-auth-flow.js
 */

import http from 'http';

console.log('🧪 Testing Authentication Flow...\n');

// Test 1: Check if login page is accessible
console.log('Test 1: Checking login page...');
const test1 = new Promise((resolve) => {
  http.get('http://localhost:3000/', (res) => {
    const statusCode = res.statusCode;
    console.log(`   Status: ${statusCode}`);
    if (statusCode === 200) {
      console.log('   ✅ Login page is accessible');
      resolve(true);
    } else {
      console.log(`   ❌ Unexpected status: ${statusCode}`);
      resolve(false);
    }
  }).on('error', (err) => {
    console.log(`   ❌ Error: ${err.message}`);
    resolve(false);
  });
});

// Test 2: Check if auth initiation endpoint exists
console.log('\nTest 2: Checking auth initiation endpoint...');
const test2 = new Promise((resolve) => {
  http.get('http://localhost:3000/auth/twitch', (res) => {
    const statusCode = res.statusCode;
    console.log(`   Status: ${statusCode}`);
    
    // Should redirect (302 or 307) to Twitch
    if (statusCode === 302 || statusCode === 307 || statusCode === 301) {
      const location = res.headers.location || '';
      if (location.includes('twitch.tv') || location.includes('id.twitch.tv')) {
        console.log('   ✅ Auth endpoint redirects to Twitch');
        console.log(`   Redirect location: ${location.substring(0, 80)}...`);
        resolve(true);
      } else {
        console.log(`   ⚠️  Redirects but not to Twitch: ${location}`);
        resolve(false);
      }
    } else {
      console.log(`   ❌ Unexpected status: ${statusCode}`);
      resolve(false);
    }
  }).on('error', (err) => {
    console.log(`   ❌ Error: ${err.message}`);
    resolve(false);
  });
});

// Test 3: Check logout endpoint
console.log('\nTest 3: Checking logout endpoint...');
const test3 = new Promise((resolve) => {
  http.get('http://localhost:3000/auth/logout', (res) => {
    const statusCode = res.statusCode;
    console.log(`   Status: ${statusCode}`);
    
    // Should redirect (302 or 307) to home
    if (statusCode === 302 || statusCode === 307 || statusCode === 301) {
      const location = res.headers.location || '';
      if (location.includes('/?logged_out=true') || location === '/') {
        console.log('   ✅ Logout endpoint redirects correctly');
        console.log(`   Redirect location: ${location}`);
        resolve(true);
      } else {
        console.log(`   ⚠️  Redirects to: ${location}`);
        resolve(false);
      }
    } else {
      console.log(`   ❌ Unexpected status: ${statusCode}`);
      resolve(false);
    }
  }).on('error', (err) => {
    console.log(`   ❌ Error: ${err.message}`);
    resolve(false);
  });
});

// Test 4: Check dashboard requires auth
console.log('\nTest 4: Checking dashboard requires authentication...');
const test4 = new Promise((resolve) => {
  http.get('http://localhost:3000/dashboard', (res) => {
    const statusCode = res.statusCode;
    console.log(`   Status: ${statusCode}`);
    
    // Should redirect to home if not authenticated
    if (statusCode === 302 || statusCode === 307 || statusCode === 301) {
      const location = res.headers.location || '';
      if (location === '/' || location.includes('/?')) {
        console.log('   ✅ Dashboard requires authentication (redirects to home)');
        resolve(true);
      } else {
        console.log(`   ⚠️  Redirects to: ${location}`);
        resolve(false);
      }
    } else if (statusCode === 200) {
      console.log('   ⚠️  Dashboard accessible without auth (security issue!)');
      resolve(false);
    } else {
      console.log(`   ❌ Unexpected status: ${statusCode}`);
      resolve(false);
    }
  }).on('error', (err) => {
    console.log(`   ❌ Error: ${err.message}`);
    resolve(false);
  });
});

// Run all tests
Promise.all([test1, test2, test3, test4]).then((results) => {
  const allPassed = results.every(r => r === true);
  
  console.log('\n' + '='.repeat(50));
  if (allPassed) {
    console.log('✅ ALL TESTS PASSED - Authentication flow looks good!');
    console.log('\n📝 Manual Testing Steps:');
    console.log('1. Open http://localhost:3000 in your browser');
    console.log('2. Click "Connect with Twitch"');
    console.log('3. Complete OAuth flow');
    console.log('4. You should be redirected to /dashboard');
    console.log('5. Click logout');
    console.log('6. You should be redirected to /?logged_out=true');
    console.log('7. Click "Connect with Twitch" again');
    console.log('8. Check server console for [LOGOUT] and [AUTH] logs');
  } else {
    console.log('❌ SOME TESTS FAILED');
    console.log('\nTroubleshooting:');
    console.log('- Make sure server is running: npm start');
    console.log('- Check server console for errors');
  }
  console.log('='.repeat(50));
  
  process.exit(allPassed ? 0 : 1);
});

