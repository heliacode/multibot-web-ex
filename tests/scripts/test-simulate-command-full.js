/**
 * Full end-to-end test for simulate-command endpoint
 * Tests the complete flow including WebSocket broadcasting
 */

import http from 'http';
import WebSocket from 'ws';
import pool from '../../config/database.js';
import { getActiveAudioCommandsByTwitchUserId } from '../../models/audioCommand.js';
import { getActiveGifCommandsByTwitchUserId } from '../../models/gifCommand.js';

const TEST_TWITCH_USER_ID = '25019517';
const WS_URL = 'ws://localhost:3000';

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

async function testFullFlow() {
    console.log('🧪 Full End-to-End Test for Command Simulation...\n');
    console.log('='.repeat(60));
    
    try {
        // Get OBS token for WebSocket
        const userResult = await pool.query(
            'SELECT id FROM users WHERE twitch_user_id = $1',
            [TEST_TWITCH_USER_ID]
        );
        
        if (userResult.rows.length === 0) {
            console.log('⚠️  Test user not found');
            return;
        }
        
        const userId = userResult.rows[0].id;
        const tokenResult = await pool.query(
            'SELECT token FROM obs_tokens WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1',
            [userId]
        );
        
        if (tokenResult.rows.length === 0) {
            console.log('⚠️  No OBS token found for test user');
            return;
        }
        
        const token = tokenResult.rows[0].token;
        
        // Test 1: Connect WebSocket to receive broadcasts
        console.log('\n1️⃣  Setting up WebSocket connection...\n');
        const ws = new WebSocket(`${WS_URL}?token=${encodeURIComponent(token)}`);
        
        let wsAuthenticated = false;
        let commandReceived = false;
        let receivedCommandData = null;
        
        await new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                reject(new Error('WebSocket connection timeout'));
            }, 5000);
            
            ws.on('open', () => {
                ws.send(JSON.stringify({
                    type: 'obs_authenticate',
                    token: token
                }));
            });
            
            ws.on('message', (data) => {
                try {
                    const message = JSON.parse(data.toString());
                    if (message.type === 'obs_authenticated') {
                        wsAuthenticated = true;
                        clearTimeout(timeout);
                        console.log('   ✓ WebSocket authenticated');
                        resolve();
                    } else if (message.type === 'command_trigger') {
                        commandReceived = true;
                        receivedCommandData = message.command;
                        console.log('   ✓ Command trigger received via WebSocket!');
                        console.log(`      Type: ${message.command.type}`);
                        console.log(`      Command: ${message.command.command}`);
                    }
                } catch (error) {
                    // Ignore parse errors
                }
            });
            
            ws.on('error', (error) => {
                clearTimeout(timeout);
                reject(error);
            });
        });
        
        logTest('WebSocket connection', wsAuthenticated);
        
        // Test 2: Test simulate-command endpoint (without session - should fail)
        console.log('\n2️⃣  Testing endpoint without authentication...\n');
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
            
            req.on('error', () => resolve({ status: 0, body: { error: 'Connection failed' } }));
            req.on('timeout', () => { req.destroy(); resolve({ status: 0, body: { error: 'Timeout' } }); });
            req.write(JSON.stringify({ command: 'test' }));
            req.end();
        });
        
        logTest('Endpoint requires authentication', noAuthResponse.status === 401 || noAuthResponse.status === 400);
        
        // Test 3: Test with actual commands via processCommand
        console.log('\n3️⃣  Testing command processing and WebSocket broadcast...\n');
        
        const { processCommand } = await import('../services/twitchChat.js');
        
        // Test audio command
        const audioCommands = await getActiveAudioCommandsByTwitchUserId(TEST_TWITCH_USER_ID);
        if (audioCommands.length > 0) {
            const testCmd = audioCommands[0];
            commandReceived = false;
            receivedCommandData = null;
            
            console.log(`   Testing audio command: !${testCmd.command}`);
            await processCommand(TEST_TWITCH_USER_ID, `!${testCmd.command}`);
            
            // Wait a bit for WebSocket message
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            if (commandReceived && receivedCommandData) {
                logTest('Audio command broadcast via WebSocket', receivedCommandData.type === 'audio_command');
                logTest('Audio command data correct', receivedCommandData.command === testCmd.command);
            } else {
                logTest('Audio command broadcast via WebSocket', false, 'No WebSocket message received');
            }
        }
        
        // Test GIF command
        const gifCommands = await getActiveGifCommandsByTwitchUserId(TEST_TWITCH_USER_ID);
        if (gifCommands.length > 0) {
            const testCmd = gifCommands[0];
            commandReceived = false;
            receivedCommandData = null;
            
            console.log(`   Testing GIF command: !${testCmd.command}`);
            await processCommand(TEST_TWITCH_USER_ID, `!${testCmd.command}`);
            
            // Wait a bit for WebSocket message
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            if (commandReceived && receivedCommandData) {
                logTest('GIF command broadcast via WebSocket', receivedCommandData.type === 'gif_command');
                logTest('GIF command data correct', receivedCommandData.command === testCmd.command);
            } else {
                logTest('GIF command broadcast via WebSocket', false, 'No WebSocket message received');
            }
        }
        
        ws.close();
        
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

testFullFlow();

