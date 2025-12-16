/**
 * Test script to verify bits simulation endpoint works
 * This tests the /api/test/simulate-bits endpoint without requiring WebSocket
 */

import http from 'http';
import pool from '../config/database.js';
import { processBitsDonation } from '../services/twitchChat.js';
import { getActiveBitTriggersByTwitchUserId } from '../models/bitTrigger.js';

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

async function testBitsSimulation() {
    console.log('🧪 Testing Bits Simulation Feature...\n');
    console.log('='.repeat(60));
    
    try {
        // Test 1: Verify bit triggers exist
        console.log('\n1️⃣  Checking bit triggers...\n');
        const triggers = await getActiveBitTriggersByTwitchUserId(TEST_TWITCH_USER_ID);
        logTest('Bit triggers exist', triggers.length > 0);
        
        if (triggers.length === 0) {
            console.log('⚠️  No bit triggers found. Please create one in the dashboard first.');
            return;
        }
        
        console.log(`   Found ${triggers.length} bit trigger(s)`);
        triggers.forEach(t => {
            console.log(`   - ${t.bit_amount} bits -> ${t.command_type} command`);
        });
        
        // Test 2: Test processBitsDonation directly
        console.log('\n2️⃣  Testing processBitsDonation function...\n');
        const testTrigger = triggers[0];
        const result = await processBitsDonation(TEST_TWITCH_USER_ID, testTrigger.bit_amount, 'test_viewer');
        
        logTest('processBitsDonation works', result !== null);
        if (result) {
            logTest('processBitsDonation returns correct type', result.type === testTrigger.command_type);
            logTest('processBitsDonation returns command name', result.command !== undefined);
        }
        
        // Test 3: Test with different bit amounts
        console.log('\n3️⃣  Testing trigger lookup with different amounts...\n');
        const testAmounts = [25, 50, 75, 100, 150, 200];
        
        for (const amount of testAmounts) {
            const result = await processBitsDonation(TEST_TWITCH_USER_ID, amount, 'test_viewer');
            if (result) {
                console.log(`   ✓ ${amount} bits -> ${result.type} command "${result.command}"`);
                logTest(`Bits trigger works for ${amount} bits`, true);
            } else {
                console.log(`   - ${amount} bits -> No trigger found`);
            }
        }
        
        // Test 4: Test API endpoint (without auth - should fail)
        console.log('\n4️⃣  Testing API endpoint...\n');
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
            
            req.write(JSON.stringify({ bits: 50, username: 'test' }));
            req.end();
        });
        
        if (endpointResponse.status === 0) {
            console.log('   ⚠ Server not running - endpoint test skipped');
        } else {
            logTest('API endpoint exists', endpointResponse.status === 401 || endpointResponse.status === 400);
        }
        
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
            console.log('\n💡 To test in the browser:');
            console.log('   1. Go to the dashboard');
            console.log('   2. Navigate to "Bits Triggers" section');
            console.log('   3. Click the "Test" button next to any trigger');
            console.log('   4. The command should trigger in your OBS source!');
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

testBitsSimulation();

