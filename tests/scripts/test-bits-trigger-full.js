/**
 * Full end-to-end test for bits trigger functionality
 * Tests the complete flow: bits donation -> trigger lookup -> command execution -> WebSocket broadcast
 */

import http from 'http';
import WebSocket from 'ws';
import pool from '../../config/database.js';
import { createBitTrigger, getActiveBitTriggersByTwitchUserId, findBitTriggerForAmount } from '../../models/bitTrigger.js';
import { getActiveAudioCommandsByTwitchUserId } from '../../models/audioCommand.js';
import { getActiveGifCommandsByTwitchUserId } from '../../models/gifCommand.js';
import { getUserByTwitchId } from '../../models/user.js';
import { processBitsDonation } from '../../services/twitchChat.js';

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

async function testBitsTriggerFullFlow() {
    console.log('🧪 Full End-to-End Test for Bits Triggers...\n');
    console.log('='.repeat(60));
    
    try {
        // Setup: Get user and commands
        console.log('\n1️⃣  Setting up test data...\n');
        const user = await getUserByTwitchId(TEST_TWITCH_USER_ID);
        if (!user) {
            console.log('⚠️  Test user not found');
            return;
        }
        
        const audioCommands = await getActiveAudioCommandsByTwitchUserId(TEST_TWITCH_USER_ID);
        const gifCommands = await getActiveGifCommandsByTwitchUserId(TEST_TWITCH_USER_ID);
        
        console.log(`   Found ${audioCommands.length} audio commands`);
        console.log(`   Found ${gifCommands.length} GIF commands`);
        
        if (audioCommands.length === 0 && gifCommands.length === 0) {
            console.log('⚠️  No commands found to test with');
            return;
        }
        
        // Create test triggers if they don't exist
        console.log('\n2️⃣  Creating test bit triggers...\n');
        let audioTrigger = null;
        let gifTrigger = null;
        
        const existingTriggers = await getActiveBitTriggersByTwitchUserId(TEST_TWITCH_USER_ID);
        
        if (audioCommands.length > 0) {
            const existingAudio = existingTriggers.find(t => t.bit_amount === 50 && t.command_type === 'audio');
            if (!existingAudio) {
                try {
                    audioTrigger = await createBitTrigger({
                        userId: user.id,
                        twitchUserId: TEST_TWITCH_USER_ID,
                        bitAmount: 50,
                        commandType: 'audio',
                        commandId: audioCommands[0].id
                    });
                    console.log(`   ✓ Created audio trigger: 50 bits -> ${audioCommands[0].command}`);
                } catch (error) {
                    if (error.message.includes('already exists')) {
                        audioTrigger = existingTriggers.find(t => t.bit_amount === 50 && t.command_type === 'audio');
                        console.log(`   ⚠ Audio trigger already exists, using existing one`);
                    } else {
                        throw error;
                    }
                }
            } else {
                audioTrigger = existingAudio;
                console.log(`   ✓ Using existing audio trigger: 50 bits`);
            }
        }
        
        if (gifCommands.length > 0) {
            const existingGif = existingTriggers.find(t => t.bit_amount === 100 && t.command_type === 'gif');
            if (!existingGif) {
                try {
                    gifTrigger = await createBitTrigger({
                        userId: user.id,
                        twitchUserId: TEST_TWITCH_USER_ID,
                        bitAmount: 100,
                        commandType: 'gif',
                        commandId: gifCommands[0].id
                    });
                    console.log(`   ✓ Created GIF trigger: 100 bits -> ${gifCommands[0].command}`);
                } catch (error) {
                    if (error.message.includes('already exists')) {
                        gifTrigger = existingTriggers.find(t => t.bit_amount === 100 && t.command_type === 'gif');
                        console.log(`   ⚠ GIF trigger already exists, using existing one`);
                    } else {
                        throw error;
                    }
                }
            } else {
                gifTrigger = existingGif;
                console.log(`   ✓ Using existing GIF trigger: 100 bits`);
            }
        }
        
        // Test 3: Get OBS token and connect WebSocket
        console.log('\n3️⃣  Setting up WebSocket connection...\n');
        const tokenResult = await pool.query(
            'SELECT token FROM obs_tokens WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1',
            [user.id]
        );
        
        if (tokenResult.rows.length === 0) {
            console.log('⚠️  No OBS token found - WebSocket tests will be skipped');
        } else {
            const token = tokenResult.rows[0].token;
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
                            if (message.command.triggeredBy === 'bits') {
                                console.log(`      Bits: ${message.command.bits}`);
                                console.log(`      Donor: ${message.command.username}`);
                            }
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
            
            // Test 4: Test processBitsDonation directly
            console.log('\n4️⃣  Testing processBitsDonation function...\n');
            
            if (audioTrigger) {
                commandReceived = false;
                receivedCommandData = null;
                
                console.log(`   Testing: ${audioTrigger.bit_amount} bits -> audio command`);
                const result = await processBitsDonation(TEST_TWITCH_USER_ID, audioTrigger.bit_amount, 'test_user');
                
                // Wait for WebSocket message
                await new Promise(resolve => setTimeout(resolve, 1000));
                
                if (result) {
                    logTest('processBitsDonation returns result', result.type === 'audio');
                    logTest('processBitsDonation broadcasts via WebSocket', commandReceived && receivedCommandData);
                    if (commandReceived && receivedCommandData) {
                        logTest('Command data includes bits info', receivedCommandData.triggeredBy === 'bits');
                        logTest('Command data includes bits amount', receivedCommandData.bits === audioTrigger.bit_amount);
                    }
                } else {
                    logTest('processBitsDonation returns result', false, 'No result returned');
                }
            }
            
            if (gifTrigger) {
                commandReceived = false;
                receivedCommandData = null;
                
                console.log(`   Testing: ${gifTrigger.bit_amount} bits -> GIF command`);
                const result = await processBitsDonation(TEST_TWITCH_USER_ID, gifTrigger.bit_amount, 'test_user');
                
                // Wait for WebSocket message
                await new Promise(resolve => setTimeout(resolve, 1000));
                
                if (result) {
                    logTest('processBitsDonation works for GIF', result.type === 'gif');
                    logTest('GIF command broadcasts via WebSocket', commandReceived && receivedCommandData);
                    if (commandReceived && receivedCommandData) {
                        logTest('GIF command includes bits info', receivedCommandData.triggeredBy === 'bits');
                    }
                } else {
                    logTest('processBitsDonation works for GIF', false, 'No result returned');
                }
            }
            
            // Test 5: Test trigger lookup with different amounts
            console.log('\n5️⃣  Testing trigger lookup logic...\n');
            const testCases = [
                { amount: 25, shouldFind: false },
                { amount: 50, shouldFind: true, expectedAmount: 50 },
                { amount: 75, shouldFind: true, expectedAmount: 50 },
                { amount: 100, shouldFind: true, expectedAmount: 100 },
                { amount: 150, shouldFind: true, expectedAmount: 100 }
            ];
            
            for (const testCase of testCases) {
                const trigger = await findBitTriggerForAmount(TEST_TWITCH_USER_ID, testCase.amount);
                if (testCase.shouldFind) {
                    logTest(`Find trigger for ${testCase.amount} bits`, 
                        trigger !== null && trigger.bit_amount === testCase.expectedAmount);
                } else {
                    logTest(`No trigger for ${testCase.amount} bits`, trigger === null);
                }
            }
            
            ws.close();
        }
        
        // Test 6: Test the API endpoint (without session - will fail auth)
        console.log('\n6️⃣  Testing API endpoint...\n');
        const endpointResponse = await new Promise((resolve) => {
            const req = http.request({
                hostname: 'localhost',
                port: 3000,
                path: '/api/test/simulate-bits',
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Content-Length': Buffer.byteLength(JSON.stringify({ bits: 50, username: 'test' }))
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
            req.write(JSON.stringify({ bits: 50, username: 'test' }));
            req.end();
        });
        
        logTest('API endpoint exists', endpointResponse.status === 401 || endpointResponse.status === 400);
        
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

testBitsTriggerFullFlow();

