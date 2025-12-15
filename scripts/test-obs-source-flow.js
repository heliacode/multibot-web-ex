/**
 * End-to-end test script for OBS Source functionality
 * Tests the complete flow: token generation -> URL encoding -> OBS source loading
 * Run with: node scripts/test-obs-source-flow.js
 */

import pool from '../config/database.js';
import { getOrCreateObsToken, regenerateObsToken, getObsTokenByToken } from '../models/obsToken.js';
import { getUserByTwitchId } from '../models/user.js';
import http from 'http';

const BASE_URL = process.env.TEST_URL || 'http://localhost:3000';

async function testObsSourceFlow() {
  console.log('🧪 Testing OBS Source Flow...\n');
  
  let testUserId = null;
  let testTwitchUserId = 'test-integration-user';
  let errors = [];
  let passed = 0;
  let failed = 0;

  try {
    // 1. Get or create test user
    console.log('1️⃣  Setting up test user...');
    let user = null;
    try {
      user = await getUserByTwitchId(testTwitchUserId);
    } catch (error) {
      // User lookup failed (maybe encryption issue) - create new one
      console.log('   User lookup failed, creating new test user...');
    }
    
    if (!user) {
      console.log('   Creating test user...');
      // Check if user exists in DB directly (bypass encryption)
      const existingUser = await pool.query(
        'SELECT id FROM users WHERE twitch_user_id = $1',
        [testTwitchUserId]
      );
      
      if (existingUser.rows.length > 0) {
        testUserId = existingUser.rows[0].id;
        console.log('   ✓ Test user exists in database');
      } else {
        // Create new user with plain tokens (for testing)
        const result = await pool.query(
          `INSERT INTO users (twitch_user_id, twitch_username, twitch_display_name, access_token, refresh_token, token_expires_at, scopes)
           VALUES ($1, $2, $3, $4, $5, $6, $7)
           RETURNING id`,
          [testTwitchUserId, 'testuser', 'Test User', 'test-token', 'test-refresh', new Date(), '[]']
        );
        testUserId = result.rows[0].id;
        console.log('   ✓ Test user created');
      }
    } else {
      testUserId = user.id;
      console.log('   ✓ Test user exists');
    }
    passed++;

    // 2. Create OBS token
    console.log('\n2️⃣  Creating OBS token...');
    const tokenData = await getOrCreateObsToken(testUserId, testTwitchUserId);
    console.log(`   ✓ Token created: ${tokenData.token.substring(0, 20)}...`);
    passed++;

    // 3. Test token lookup
    console.log('\n3️⃣  Testing token lookup...');
    const foundToken = await getObsTokenByToken(tokenData.token);
    if (!foundToken) {
      throw new Error('Token lookup failed');
    }
    if (foundToken.token !== tokenData.token) {
      throw new Error('Token mismatch');
    }
    console.log('   ✓ Token lookup works');
    passed++;

    // 4. Test URL encoding
    console.log('\n4️⃣  Testing URL encoding...');
    const encodedToken = encodeURIComponent(tokenData.token);
    const decodedToken = decodeURIComponent(encodedToken);
    if (decodedToken !== tokenData.token) {
      throw new Error('URL encoding/decoding failed');
    }
    console.log('   ✓ URL encoding works correctly');
    passed++;

    // 5. Test OBS source route (if server is running)
    console.log('\n5️⃣  Testing OBS source route...');
    try {
      const url = `${BASE_URL}/obs-source?token=${encodedToken}`;
      const response = await new Promise((resolve, reject) => {
        http.get(url, (res) => {
          let data = '';
          res.on('data', (chunk) => { data += chunk; });
          res.on('end', () => resolve({ status: res.statusCode, body: data }));
        }).on('error', reject);
      });

      if (response.status === 200) {
        if (response.body.includes('MultiBot OBS Browser Source')) {
          if (response.body.includes(tokenData.token)) {
            console.log('   ✓ OBS source route works correctly');
            passed++;
          } else {
            throw new Error('Token not found in HTML response');
          }
        } else {
          throw new Error('OBS source HTML not found');
        }
      } else {
        throw new Error(`Unexpected status code: ${response.status}`);
      }
    } catch (error) {
      if (error.code === 'ECONNREFUSED') {
        console.log('   ⚠ Server not running - skipping route test');
        console.log('   💡 Start server with: npm start');
      } else {
        throw error;
      }
    }

    // 6. Test token regeneration
    console.log('\n6️⃣  Testing token regeneration...');
    const oldToken = tokenData.token;
    const newTokenData = await regenerateObsToken(testUserId, testTwitchUserId);
    
    // Old token should not be found
    const oldTokenLookup = await getObsTokenByToken(oldToken);
    if (oldTokenLookup) {
      throw new Error('Old token still exists after regeneration');
    }
    
    // New token should be found
    const newTokenLookup = await getObsTokenByToken(newTokenData.token);
    if (!newTokenLookup) {
      throw new Error('New token not found after regeneration');
    }
    
    if (oldToken === newTokenData.token) {
      throw new Error('Token was not regenerated');
    }
    
    console.log('   ✓ Token regeneration works correctly');
    passed++;

    // 7. Test new token works in OBS source
    console.log('\n7️⃣  Testing regenerated token in OBS source...');
    try {
      const url = `${BASE_URL}/obs-source?token=${encodeURIComponent(newTokenData.token)}`;
      const response = await new Promise((resolve, reject) => {
        http.get(url, (res) => {
          let data = '';
          res.on('data', (chunk) => { data += chunk; });
          res.on('end', () => resolve({ status: res.statusCode, body: data }));
        }).on('error', reject);
      });

      if (response.status === 200 && response.body.includes('MultiBot OBS Browser Source')) {
        console.log('   ✓ Regenerated token works in OBS source');
        passed++;
      } else {
        throw new Error('Regenerated token failed in OBS source');
      }
    } catch (error) {
      if (error.code === 'ECONNREFUSED') {
        console.log('   ⚠ Server not running - skipping route test');
      } else {
        throw error;
      }
    }

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 Test Summary:');
    console.log(`   ✅ Passed: ${passed}`);
    console.log(`   ❌ Failed: ${failed}`);
    if (errors.length > 0) {
      console.log('\n❌ Errors:');
      errors.forEach((error, i) => {
        console.log(`   ${i + 1}. ${error}`);
      });
    }
    console.log('='.repeat(60));

    if (failed === 0 && errors.length === 0) {
      console.log('\n✅ All tests passed! OBS source flow is working correctly.');
      process.exit(0);
    } else {
      console.log('\n❌ Some tests failed. Please review the errors above.');
      process.exit(1);
    }

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    // Clean up
    if (testUserId) {
      try {
        await pool.query('DELETE FROM obs_tokens WHERE user_id = $1', [testUserId]);
        await pool.query('DELETE FROM design_elements WHERE user_id = $1', [testUserId]);
      } catch (e) {
        // Ignore cleanup errors
      }
    }
    await pool.end();
  }
}

testObsSourceFlow();

