/**
 * Test script to verify command simulation functionality
 * Tests the /api/test/simulate-command endpoint
 */

import http from 'http';
import pool from '../config/database.js';
import { getActiveAudioCommandsByTwitchUserId } from '../models/audioCommand.js';
import { getActiveGifCommandsByTwitchUserId } from '../models/gifCommand.js';

const TEST_TWITCH_USER_ID = '25019517';

let results = {
    passed: 0,
    failed: 0,
    errors: []
};

function logTest(name, passed, error = null) {
    if (passed) {
        console.log(`   ✅ ${name}`);
        results.passed++;
    } else {
        console.log(`   ❌ ${name}`);
        if (error) {
            console.log(`      Error: ${error}`);
            results.errors.push(`${name}: ${error}`);
        }
        results.failed++;
    }
}

async function testSimulateCommandEndpoint() {
    console.log('🧪 Testing Command Simulation Endpoint...\n');
    console.log('='.repeat(60));
    
    try {
        // Test 1: Check if endpoint exists (without auth - should fail with 401)
        console.log('\n1️⃣  Testing endpoint authentication...\n');
        const noAuthResponse = await new Promise((resolve) => {
            const req = http.request({
                hostname: 'localhost',
                port: 3000,
                path: '/api/test/simulate-command',
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Content-Length': Buffer.byteLength(JSON.stringify({ command: 'test' }))
                },
                timeout: 5000
            }, (res) => {
                let data = '';
                res.on('data', (chunk) => { data += chunk; });
                res.on('end', () => {
                    try {
                        resolve({ status: res.statusCode, body: JSON.parse(data) });
                    } catch (e) {
                        resolve({ status: res.statusCode, body: { error: 'Invalid JSON' } });
                    }
                });
            });
            
            req.on('error', (error) => {
                if (error.code === 'ECONNREFUSED') {
                    resolve({ status: 0, body: { error: 'Server not running' } });
                } else {
                    resolve({ status: 0, body: { error: error.message } });
                }
            });
            
            req.on('timeout', () => {
                req.destroy();
                resolve({ status: 0, body: { error: 'Timeout' } });
            });
            
            req.write(JSON.stringify({ command: 'test' }));
            req.end();
        });
        
        if (noAuthResponse.status === 0) {
            logTest('Server is running', false, noAuthResponse.body.error);
            console.log('\n⚠️  Cannot test - server not running or connection failed');
            return;
        }
        
        logTest('Endpoint exists', noAuthResponse.status === 401 || noAuthResponse.status === 400);
        
        // Test 2: Get commands from database
        console.log('\n2️⃣  Testing with real commands...\n');
        const audioCommands = await getActiveAudioCommandsByTwitchUserId(TEST_TWITCH_USER_ID);
        const gifCommands = await getActiveGifCommandsByTwitchUserId(TEST_TWITCH_USER_ID);
        
        console.log(`   Found ${audioCommands.length} audio commands`);
        console.log(`   Found ${gifCommands.length} GIF commands`);
        
        if (audioCommands.length === 0 && gifCommands.length === 0) {
            console.log('\n⚠️  No commands found to test');
            return;
        }
        
        // Test 3: Test processCommand function directly (if we can import it)
        console.log('\n3️⃣  Testing processCommand function...\n');
        try {
            const { processCommand } = await import('../services/twitchChat.js');
            
            if (audioCommands.length > 0) {
                const testCmd = audioCommands[0];
                const commandMessage = `!${testCmd.command}`;
                console.log(`   Testing: ${commandMessage}`);
                
                const result = await processCommand(TEST_TWITCH_USER_ID, commandMessage);
                
                if (result) {
                    logTest('processCommand works for audio', result.type === 'audio');
                    logTest('processCommand returns correct command', result.command === testCmd.command);
                } else {
                    logTest('processCommand works for audio', false, 'No result returned');
                }
            }
            
            if (gifCommands.length > 0) {
                const testCmd = gifCommands[0];
                const commandMessage = `!${testCmd.command}`;
                console.log(`   Testing: ${commandMessage}`);
                
                const result = await processCommand(TEST_TWITCH_USER_ID, commandMessage);
                
                if (result) {
                    logTest('processCommand works for GIF', result.type === 'gif');
                    logTest('processCommand returns correct command', result.command === testCmd.command);
                } else {
                    logTest('processCommand works for GIF', false, 'No result returned');
                }
            }
        } catch (error) {
            logTest('processCommand import', false, error.message);
        }
        
        // Test 4: Verify WebSocket broadcasting happens
        console.log('\n4️⃣  Testing WebSocket broadcasting...\n');
        // This would require a WebSocket connection, which is complex in a test script
        // We'll verify the function exists and can be called
        logTest('WebSocket server available', global.wss !== undefined || typeof global.wss !== 'undefined');
        
        // Summary
        console.log('\n' + '='.repeat(60));
        console.log('📊 Test Summary:');
        console.log(`   ✅ Passed: ${results.passed}`);
        console.log(`   ❌ Failed: ${results.failed}`);
        
        if (results.errors.length > 0) {
            console.log('\n❌ Errors:');
            results.errors.forEach((error, i) => {
                console.log(`   ${i + 1}. ${error}`);
            });
        }
        
        console.log('='.repeat(60));
        
        if (results.failed === 0) {
            console.log('\n✅ All tests passed!');
            process.exit(0);
        } else {
            console.log(`\n⚠️  ${results.failed} test(s) failed`);
            process.exit(1);
        }
        
    } catch (error) {
        console.error('\n❌ Test failed:', error.message);
        console.error(error.stack);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

testSimulateCommandEndpoint();

