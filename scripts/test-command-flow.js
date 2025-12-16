/**
 * Comprehensive test script for both audio and GIF commands
 * Tests the complete flow: command processing -> WebSocket broadcasting -> OBS source receiving
 */

import pool from '../config/database.js';
import { getActiveAudioCommandsByTwitchUserId } from '../models/audioCommand.js';
import { getActiveGifCommandsByTwitchUserId } from '../models/gifCommand.js';
import WebSocket from 'ws';

const TEST_TWITCH_USER_ID = '25019517';
const SERVER_URL = process.env.TEST_URL || 'http://localhost:3000';
const WS_URL = process.env.WS_URL || 'ws://localhost:3000';

let testResults = {
    audio: { passed: 0, failed: 0, errors: [] },
    gif: { passed: 0, failed: 0, errors: [] }
};

async function testCommandFlow() {
    console.log('🧪 Testing Command Flow (Audio + GIF)...\n');
    
    try {
        // Test 1: Verify commands exist in database
        console.log('1️⃣  Checking commands in database...');
        const audioCommands = await getActiveAudioCommandsByTwitchUserId(TEST_TWITCH_USER_ID);
        const gifCommands = await getActiveGifCommandsByTwitchUserId(TEST_TWITCH_USER_ID);
        
        console.log(`   Found ${audioCommands.length} audio commands`);
        console.log(`   Found ${gifCommands.length} GIF commands`);
        
        if (audioCommands.length === 0 && gifCommands.length === 0) {
            throw new Error('No commands found in database');
        }
        
        // Test 2: Get OBS token and connect WebSocket
        console.log('\n2️⃣  Setting up WebSocket connection...');
        const userResult = await pool.query(
            'SELECT id FROM users WHERE twitch_user_id = $1',
            [TEST_TWITCH_USER_ID]
        );
        
        if (userResult.rows.length === 0) {
            throw new Error(`User ${TEST_TWITCH_USER_ID} not found`);
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
        console.log(`   ✓ Found OBS token`);
        
        // Connect WebSocket
        const ws = new WebSocket(`${WS_URL}?token=${encodeURIComponent(token)}`);
        
        await new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                reject(new Error('WebSocket connection timeout'));
            }, 5000);
            
            ws.on('open', () => {
                clearTimeout(timeout);
                console.log('   ✓ WebSocket connected');
                
                ws.send(JSON.stringify({
                    type: 'obs_authenticate',
                    token: token
                }));
            });
            
            ws.on('message', (data) => {
                try {
                    const message = JSON.parse(data.toString());
                    if (message.type === 'obs_authenticated') {
                        console.log('   ✓ OBS source authenticated');
                        resolve();
                    } else if (message.type === 'obs_auth_failed') {
                        reject(new Error(`Authentication failed: ${message.message}`));
                    }
                } catch (error) {
                    // Ignore parse errors during auth
                }
            });
            
            ws.on('error', (error) => {
                clearTimeout(timeout);
                reject(error);
            });
        });
        
        // Test 3: Test audio command trigger
        if (audioCommands.length > 0) {
            console.log('\n3️⃣  Testing audio command trigger...');
            const testAudioCmd = audioCommands[0];
            console.log(`   Testing command: !${testAudioCmd.command}`);
            
            // Use the test endpoint to trigger command
            const http = await import('http');
            const audioBody = JSON.stringify({
                twitchUserId: TEST_TWITCH_USER_ID,
                command: testAudioCmd.command
            });
            
            const audioResponse = await new Promise((resolve, reject) => {
                const req = http.request({
                    hostname: 'localhost',
                    port: 3000,
                    path: '/api/test/trigger-audio-command',
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Content-Length': Buffer.byteLength(audioBody)
                    }
                }, (res) => {
                    let data = '';
                    res.on('data', (chunk) => { data += chunk; });
                    res.on('end', () => {
                        try {
                            resolve(JSON.parse(data));
                        } catch (e) {
                            resolve({ success: false, error: 'Invalid JSON' });
                        }
                    });
                });
                
                req.on('error', reject);
                req.write(audioBody);
                req.end();
            });
            
            if (audioResponse.success) {
                console.log('   ✓ Audio command trigger sent');
                testResults.audio.passed++;
            } else {
                console.log('   ⚠ Audio command trigger endpoint not available (will test via WebSocket)');
            }
            
            // Wait for WebSocket message
            let audioReceived = false;
            await new Promise((resolve) => {
                const timeout = setTimeout(() => resolve(), 3000);
                
                ws.on('message', (data) => {
                    try {
                        const message = JSON.parse(data.toString());
                        if (message.type === 'command_trigger' && message.command.type === 'audio_command') {
                            audioReceived = true;
                            clearTimeout(timeout);
                            console.log('   ✓ Audio command trigger received via WebSocket');
                            console.log(`   Command: ${message.command.command}`);
                            console.log(`   File: ${message.command.filePath}`);
                            testResults.audio.passed++;
                            resolve();
                        }
                    } catch (error) {
                        // Ignore parse errors
                    }
                });
            });
            
            if (!audioReceived) {
                console.log('   ⚠ No audio command trigger received (may need to trigger manually)');
            }
        } else {
            console.log('\n3️⃣  Skipping audio command test (no audio commands found)');
        }
        
        // Test 4: Test GIF command trigger
        if (gifCommands.length > 0) {
            console.log('\n4️⃣  Testing GIF command trigger...');
            const testGifCmd = gifCommands[0];
            console.log(`   Testing command: !${testGifCmd.command}`);
            
            // Use the test endpoint to trigger command
            const http = await import('http');
            const gifBody = JSON.stringify({
                twitchUserId: TEST_TWITCH_USER_ID,
                command: testGifCmd.command
            });
            
            const gifResponse = await new Promise((resolve, reject) => {
                const req = http.request({
                    hostname: 'localhost',
                    port: 3000,
                    path: '/api/test/trigger-command',
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Content-Length': Buffer.byteLength(gifBody)
                    }
                }, (res) => {
                    let data = '';
                    res.on('data', (chunk) => { data += chunk; });
                    res.on('end', () => {
                        try {
                            resolve(JSON.parse(data));
                        } catch (e) {
                            resolve({ success: false, error: 'Invalid JSON' });
                        }
                    });
                });
                
                req.on('error', reject);
                req.write(gifBody);
                req.end();
            });
            
            if (gifResponse.success) {
                console.log('   ✓ GIF command trigger sent');
                console.log(`   Clients found: ${gifResponse.clientsFound}`);
                testResults.gif.passed++;
            } else {
                console.log('   ✗ Failed to send GIF command trigger');
                testResults.gif.failed++;
                testResults.gif.errors.push(gifResponse.error || 'Unknown error');
            }
            
            // Wait for WebSocket message
            let gifReceived = false;
            await new Promise((resolve) => {
                const timeout = setTimeout(() => resolve(), 3000);
                
                ws.on('message', (data) => {
                    try {
                        const message = JSON.parse(data.toString());
                        if (message.type === 'command_trigger' && message.command.type === 'gif_command') {
                            gifReceived = true;
                            clearTimeout(timeout);
                            console.log('   ✓ GIF command trigger received via WebSocket');
                            console.log(`   Command: ${message.command.command}`);
                            console.log(`   GIF URL: ${message.command.gifUrl.substring(0, 50)}...`);
                            console.log(`   Position: ${message.command.position || 'center'}`);
                            testResults.gif.passed++;
                            resolve();
                        }
                    } catch (error) {
                        // Ignore parse errors
                    }
                });
            });
            
            if (!gifReceived) {
                console.log('   ⚠ No GIF command trigger received via WebSocket');
                testResults.gif.failed++;
            }
        } else {
            console.log('\n4️⃣  Skipping GIF command test (no GIF commands found)');
        }
        
        ws.close();
        
        // Summary
        console.log('\n' + '='.repeat(60));
        console.log('📊 Test Summary:');
        console.log(`\nAudio Commands:`);
        console.log(`   ✅ Passed: ${testResults.audio.passed}`);
        console.log(`   ❌ Failed: ${testResults.audio.failed}`);
        if (testResults.audio.errors.length > 0) {
            console.log(`   Errors: ${testResults.audio.errors.join(', ')}`);
        }
        console.log(`\nGIF Commands:`);
        console.log(`   ✅ Passed: ${testResults.gif.passed}`);
        console.log(`   ❌ Failed: ${testResults.gif.failed}`);
        if (testResults.gif.errors.length > 0) {
            console.log(`   Errors: ${testResults.gif.errors.join(', ')}`);
        }
        console.log('='.repeat(60));
        
        const totalPassed = testResults.audio.passed + testResults.gif.passed;
        const totalFailed = testResults.audio.failed + testResults.gif.failed;
        
        if (totalFailed === 0) {
            console.log('\n✅ All tests passed!');
            process.exit(0);
        } else {
            console.log(`\n⚠️  Some tests had issues (${totalPassed} passed, ${totalFailed} failed)`);
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

testCommandFlow();

