/**
 * Comprehensive test script to verify all features still work
 * Tests: audio commands, GIF commands, bits triggers, command simulation
 */

import http from 'http';
import pool from '../config/database.js';
import { getActiveAudioCommandsByTwitchUserId } from '../models/audioCommand.js';
import { getActiveGifCommandsByTwitchUserId } from '../models/gifCommand.js';
import { getActiveBitTriggersByTwitchUserId } from '../models/bitTrigger.js';
import { processCommand, processBitsDonation } from '../services/twitchChat.js';

const TEST_TWITCH_USER_ID = '25019517';

let results = {
    audio: { passed: 0, failed: 0 },
    gif: { passed: 0, failed: 0 },
    bits: { passed: 0, failed: 0 },
    simulation: { passed: 0, failed: 0 }
};

function logTest(category, name, passed, error = null) {
    if (passed) {
        console.log(`   ✅ ${name}`);
        results[category].passed++;
    } else {
        console.log(`   ❌ ${name}`);
        if (error) console.log(`      Error: ${error}`);
        results[category].failed++;
    }
}

async function testAllFeatures() {
    console.log('🧪 Comprehensive Feature Testing...\n');
    console.log('='.repeat(60));
    
    try {
        // Test 1: Audio Commands
        console.log('\n1️⃣  Testing Audio Commands...\n');
        const audioCommands = await getActiveAudioCommandsByTwitchUserId(TEST_TWITCH_USER_ID);
        logTest('audio', 'Audio commands loaded', audioCommands.length > 0);
        
        if (audioCommands.length > 0) {
            const testCmd = audioCommands[0];
            const result = await processCommand(TEST_TWITCH_USER_ID, `!${testCmd.command}`);
            logTest('audio', 'processCommand works for audio', result !== null && result.type === 'audio');
            logTest('audio', 'Audio command has filePath', result && result.filePath !== undefined);
        }
        
        // Test 2: GIF Commands
        console.log('\n2️⃣  Testing GIF Commands...\n');
        const gifCommands = await getActiveGifCommandsByTwitchUserId(TEST_TWITCH_USER_ID);
        logTest('gif', 'GIF commands loaded', gifCommands.length > 0);
        
        if (gifCommands.length > 0) {
            const testCmd = gifCommands[0];
            const result = await processCommand(TEST_TWITCH_USER_ID, `!${testCmd.command}`);
            logTest('gif', 'processCommand works for GIF', result !== null && result.type === 'gif');
            logTest('gif', 'GIF command has gifUrl', result && result.gifUrl !== undefined);
            logTest('gif', 'GIF command has position', result && result.position !== undefined);
            logTest('gif', 'GIF command has size', result && result.size !== undefined);
        }
        
        // Test 3: Bits Triggers
        console.log('\n3️⃣  Testing Bits Triggers...\n');
        const bitTriggers = await getActiveBitTriggersByTwitchUserId(TEST_TWITCH_USER_ID);
        logTest('bits', 'Bit triggers loaded', bitTriggers.length > 0);
        
        if (bitTriggers.length > 0) {
            const testTrigger = bitTriggers[0];
            const result = await processBitsDonation(TEST_TWITCH_USER_ID, testTrigger.bit_amount, 'test_user');
            logTest('bits', 'processBitsDonation works', result !== null);
            logTest('bits', 'Bits trigger returns correct type', result && result.type === testTrigger.command_type);
        }
        
        // Test 4: Command Simulation Endpoint
        console.log('\n4️⃣  Testing Command Simulation...\n');
        const simulateResponse = await new Promise((resolve) => {
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
        
        logTest('simulation', 'Simulate command endpoint exists', 
            simulateResponse.status === 401 || simulateResponse.status === 400);
        
        // Test 5: Bits Simulation Endpoint
        console.log('\n5️⃣  Testing Bits Simulation...\n');
        const bitsSimulateResponse = await new Promise((resolve) => {
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
        
        logTest('simulation', 'Simulate bits endpoint exists', 
            bitsSimulateResponse.status === 401 || bitsSimulateResponse.status === 400);
        
        // Summary
        console.log('\n' + '='.repeat(60));
        console.log('📊 Test Summary:');
        console.log(`\nAudio Commands:`);
        console.log(`   ✅ Passed: ${results.audio.passed}`);
        console.log(`   ❌ Failed: ${results.audio.failed}`);
        console.log(`\nGIF Commands:`);
        console.log(`   ✅ Passed: ${results.gif.passed}`);
        console.log(`   ❌ Failed: ${results.gif.failed}`);
        console.log(`\nBits Triggers:`);
        console.log(`   ✅ Passed: ${results.bits.passed}`);
        console.log(`   ❌ Failed: ${results.bits.failed}`);
        console.log(`\nCommand Simulation:`);
        console.log(`   ✅ Passed: ${results.simulation.passed}`);
        console.log(`   ❌ Failed: ${results.simulation.failed}`);
        console.log('='.repeat(60));
        
        const totalPassed = Object.values(results).reduce((sum, r) => sum + r.passed, 0);
        const totalFailed = Object.values(results).reduce((sum, r) => sum + r.failed, 0);
        
        if (totalFailed === 0) {
            console.log('\n✅ All features working correctly!');
            process.exit(0);
        } else {
            console.log(`\n⚠️  ${totalFailed} test(s) failed`);
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

testAllFeatures();

