/**
 * Test script to verify bits trigger functionality
 */

import pool from '../config/database.js';
import { createBitTrigger, getActiveBitTriggersByTwitchUserId, findBitTriggerForAmount } from '../models/bitTrigger.js';
import { getActiveAudioCommandsByTwitchUserId } from '../models/audioCommand.js';
import { getActiveGifCommandsByTwitchUserId } from '../models/gifCommand.js';
import { getUserByTwitchId } from '../models/user.js';

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

async function testBitsTrigger() {
    console.log('🧪 Testing Bits Trigger Functionality...\n');
    console.log('='.repeat(60));
    
    try {
        // Test 1: Get user and commands
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
        
        // Test 2: Create a test bit trigger
        console.log('\n2️⃣  Testing bit trigger creation...\n');
        let testTrigger = null;
        
        if (audioCommands.length > 0) {
            try {
                testTrigger = await createBitTrigger({
                    userId: user.id,
                    twitchUserId: TEST_TWITCH_USER_ID,
                    bitAmount: 50,
                    commandType: 'audio',
                    commandId: audioCommands[0].id
                });
                logTest('Create bit trigger for audio', testTrigger !== null);
                console.log(`   Created trigger: ${testTrigger.bit_amount} bits -> audio command ${testTrigger.command_id}`);
            } catch (error) {
                if (error.message.includes('already exists')) {
                    console.log('   ⚠ Bit trigger already exists, using existing one');
                    const triggers = await getActiveBitTriggersByTwitchUserId(TEST_TWITCH_USER_ID);
                    testTrigger = triggers.find(t => t.bit_amount === 50 && t.command_type === 'audio');
                    logTest('Create bit trigger for audio', testTrigger !== null);
                } else {
                    logTest('Create bit trigger for audio', false, error.message);
                }
            }
        }
        
        // Test 3: Test finding triggers for different amounts
        console.log('\n3️⃣  Testing bit trigger lookup...\n');
        const testAmounts = [25, 50, 75, 100, 200];
        
        for (const amount of testAmounts) {
            const trigger = await findBitTriggerForAmount(TEST_TWITCH_USER_ID, amount);
            if (trigger) {
                logTest(`Find trigger for ${amount} bits`, trigger.bit_amount <= amount);
                console.log(`   Found: ${amount} bits -> ${trigger.bit_amount} bits trigger (${trigger.command_type})`);
            } else {
                console.log(`   No trigger found for ${amount} bits`);
            }
        }
        
        // Test 4: Verify trigger data structure
        console.log('\n4️⃣  Testing trigger data structure...\n');
        const triggers = await getActiveBitTriggersByTwitchUserId(TEST_TWITCH_USER_ID);
        
        if (triggers.length > 0) {
            const trigger = triggers[0];
            logTest('Trigger has bit_amount', trigger.hasOwnProperty('bit_amount'));
            logTest('Trigger has command_type', trigger.hasOwnProperty('command_type'));
            logTest('Trigger has command_id', trigger.hasOwnProperty('command_id'));
            logTest('Trigger has command_name', trigger.hasOwnProperty('command_name'));
            logTest('Command type is valid', ['audio', 'gif'].includes(trigger.command_type));
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

testBitsTrigger();

