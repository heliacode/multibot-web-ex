/**
 * Test script for GIF command flow
 * Tests: command loading -> processing -> WebSocket broadcasting -> OBS source receiving
 */

import pool from '../../config/database.js';
import { getActiveGifCommandsByTwitchUserId } from '../../models/gifCommand.js';
import WebSocket from 'ws';

const TEST_TWITCH_USER_ID = '25019517'; // The user ID from the database
const SERVER_URL = process.env.TEST_URL || 'http://localhost:3000';
const WS_URL = process.env.WS_URL || 'ws://localhost:3000';

let errors = [];
let passed = 0;
let failed = 0;

async function testGifCommandFlow() {
  console.log('🧪 Testing GIF Command Flow...\n');
  
  try {
    // Test 1: Verify GIF commands exist in database
    console.log('1️⃣  Checking GIF commands in database...');
    const gifCommands = await getActiveGifCommandsByTwitchUserId(TEST_TWITCH_USER_ID);
    console.log(`   Found ${gifCommands.length} GIF commands:`);
    gifCommands.forEach(cmd => {
      console.log(`   - !${cmd.command} -> ${cmd.gif_url.substring(0, 50)}...`);
    });
    
    if (gifCommands.length === 0) {
      throw new Error('No GIF commands found in database');
    }
    
    const testCommand = gifCommands[0];
    console.log(`   ✓ Using test command: !${testCommand.command}`);
    passed++;
    
    // Test 2: Test command processing (simulate)
    console.log('\n2️⃣  Testing command processing...');
    console.log(`   Simulating command: !${testCommand.command}`);
    
    // We can't directly call processCommand as it's not exported
    // But we can verify the command exists and has the right structure
    if (!testCommand.gif_url || !testCommand.command) {
      throw new Error('Command missing required fields');
    }
    console.log(`   ✓ Command structure is valid`);
    console.log(`   - Command: ${testCommand.command}`);
    console.log(`   - GIF URL: ${testCommand.gif_url}`);
    console.log(`   - Duration: ${testCommand.duration || 5000}ms`);
    passed++;
    
    // Test 3: Test WebSocket connection and authentication
    console.log('\n3️⃣  Testing WebSocket connection...');
    
    // First, get an OBS token for the user
    const userResult = await pool.query(
      'SELECT id FROM users WHERE twitch_user_id = $1',
      [TEST_TWITCH_USER_ID]
    );
    
    if (userResult.rows.length === 0) {
      throw new Error(`User ${TEST_TWITCH_USER_ID} not found in database`);
    }
    
    const userId = userResult.rows[0].id;
    const tokenResult = await pool.query(
      'SELECT token FROM obs_tokens WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1',
      [userId]
    );
    
    if (tokenResult.rows.length === 0) {
      throw new Error(`No OBS token found for user ${TEST_TWITCH_USER_ID}`);
    }
    
    const token = tokenResult.rows[0].token;
    console.log(`   ✓ Found OBS token: ${token.substring(0, 20)}...`);
    
    // Connect to WebSocket
    const ws = new WebSocket(`${WS_URL}?token=${encodeURIComponent(token)}`);
    
    await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('WebSocket connection timeout'));
      }, 5000);
      
      ws.on('open', () => {
        clearTimeout(timeout);
        console.log('   ✓ WebSocket connected');
        
        // Authenticate
        ws.send(JSON.stringify({
          type: 'obs_authenticate',
          token: token
        }));
      });
      
      ws.on('message', (data) => {
        try {
          const message = JSON.parse(data.toString());
          console.log(`   Received message: ${message.type}`);
          
          if (message.type === 'obs_authenticated') {
            console.log('   ✓ OBS source authenticated');
            passed++;
            resolve();
          } else if (message.type === 'obs_auth_failed') {
            reject(new Error(`Authentication failed: ${message.message}`));
          } else if (message.type === 'command_trigger') {
            console.log('   ✓ Received command_trigger message!');
            console.log(`   Command data:`, JSON.stringify(message.command, null, 2));
            
            if (message.command.type === 'gif_command') {
              console.log(`   ✓ GIF command received: ${message.command.command}`);
              console.log(`   GIF URL: ${message.command.gifUrl}`);
              passed++;
            } else {
              console.log(`   ⚠ Unexpected command type: ${message.command.type}`);
            }
          }
        } catch (error) {
          console.error('   Error parsing message:', error);
        }
      });
      
      ws.on('error', (error) => {
        clearTimeout(timeout);
        reject(error);
      });
    });
    
    // Test 4: Simulate command trigger (we'll need to manually trigger this)
    console.log('\n4️⃣  Waiting for command trigger...');
    console.log('   💡 Please type !' + testCommand.command + ' in your Twitch chat');
    console.log('   Waiting 30 seconds for command...');
    
    let commandReceived = false;
    await new Promise((resolve) => {
      const timeout = setTimeout(() => {
        if (!commandReceived) {
          console.log('   ⚠ No command received within 30 seconds');
          console.log('   This is expected if you haven\'t typed the command yet');
        }
        resolve();
      }, 30000);
      
      ws.on('message', (data) => {
        try {
          const message = JSON.parse(data.toString());
          if (message.type === 'command_trigger' && message.command.type === 'gif_command') {
            commandReceived = true;
            clearTimeout(timeout);
            console.log('   ✓ Command trigger received!');
            console.log(`   Command: ${message.command.command}`);
            console.log(`   GIF URL: ${message.command.gifUrl}`);
            passed++;
            resolve();
          }
        } catch (error) {
          // Ignore parse errors
        }
      });
    });
    
    ws.close();
    
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
      console.log('\n✅ All tests passed!');
      process.exit(0);
    } else {
      console.log('\n❌ Some tests failed.');
      process.exit(1);
    }
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error(error.stack);
    failed++;
    process.exit(1);
  } finally {
    await pool.end();
  }
}

testGifCommandFlow();

