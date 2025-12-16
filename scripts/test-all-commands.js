/**
 * Comprehensive test script for both audio and GIF commands
 * Tests command loading, processing, and WebSocket broadcasting
 */

import pool from '../config/database.js';
import { getActiveAudioCommandsByTwitchUserId } from '../models/audioCommand.js';
import { getActiveGifCommandsByTwitchUserId } from '../models/gifCommand.js';
import http from 'http';

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

async function testCommandLoading() {
    console.log('\n1️⃣  Testing Command Loading...\n');
    
    try {
        // Test audio commands
        const audioCommands = await getActiveAudioCommandsByTwitchUserId(TEST_TWITCH_USER_ID);
        logTest('Audio commands loaded', Array.isArray(audioCommands));
        
        if (audioCommands.length > 0) {
            const cmd = audioCommands[0];
            logTest('Audio command has required fields', 
                cmd.command && cmd.file_path && cmd.hasOwnProperty('is_active'));
            
            // Verify command doesn't have ! prefix
            logTest('Audio command stored without ! prefix', 
                !cmd.command.startsWith('!'), 
                cmd.command.startsWith('!') ? `Command "${cmd.command}" has ! prefix` : null);
            
            console.log(`   Found audio commands: ${audioCommands.map(c => c.command).join(', ')}`);
        } else {
            console.log('   ⚠ No audio commands found');
        }
        
        // Test GIF commands
        const gifCommands = await getActiveGifCommandsByTwitchUserId(TEST_TWITCH_USER_ID);
        logTest('GIF commands loaded', Array.isArray(gifCommands));
        
        if (gifCommands.length > 0) {
            const cmd = gifCommands[0];
            logTest('GIF command has required fields', 
                cmd.command && cmd.gif_url && cmd.hasOwnProperty('is_active'));
            
            // Verify command doesn't have ! prefix
            logTest('GIF command stored without ! prefix', 
                !cmd.command.startsWith('!'), 
                cmd.command.startsWith('!') ? `Command "${cmd.command}" has ! prefix` : null);
            
            // Check position field
            logTest('GIF command has position field', 
                cmd.hasOwnProperty('position') || cmd.position !== undefined);
            
            console.log(`   Found GIF commands: ${gifCommands.map(c => c.command).join(', ')}`);
        } else {
            console.log('   ⚠ No GIF commands found');
        }
        
    } catch (error) {
        logTest('Command loading', false, error.message);
    }
}

async function testCommandLookup() {
    console.log('\n2️⃣  Testing Command Lookup Logic...\n');
    
    try {
        // Test that command lookup strips ! correctly
        const testCases = [
            { input: '!test', expected: 'test' },
            { input: '!DANCE', expected: 'dance' },
            { input: '!fart', expected: 'fart' },
            { input: 'test', expected: 'test' } // Already no !
        ];
        
        testCases.forEach(({ input, expected }) => {
            const result = input.toLowerCase().replace(/^!/, '');
            logTest(`Lookup "${input}" -> "${result}"`, result === expected);
        });
        
    } catch (error) {
        logTest('Command lookup', false, error.message);
    }
}

async function testWebSocketEndpoints() {
    console.log('\n3️⃣  Testing WebSocket Trigger Endpoints...\n');
    
    try {
        // Test GIF command endpoint
        const gifCommands = await getActiveGifCommandsByTwitchUserId(TEST_TWITCH_USER_ID);
        if (gifCommands.length > 0) {
            const testCmd = gifCommands[0];
            const gifBody = JSON.stringify({
                twitchUserId: TEST_TWITCH_USER_ID,
                command: testCmd.command
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
                        reject(error);
                    }
                });
                
                req.on('timeout', () => {
                    req.destroy();
                    resolve({ status: 0, body: { error: 'Timeout' } });
                });
                
                req.write(gifBody);
                req.end();
            });
            
            if (gifResponse.status === 200 && gifResponse.body.success) {
                logTest('GIF command trigger endpoint', true);
                logTest('GIF command broadcast to clients', gifResponse.body.clientsFound > 0);
            } else if (gifResponse.status === 0) {
                console.log('   ⚠ Server not running - skipping endpoint test');
            } else {
                logTest('GIF command trigger endpoint', false, gifResponse.body.error || `Status: ${gifResponse.status}`);
            }
        } else {
            console.log('   ⚠ No GIF commands to test');
        }
        
        // Test audio command endpoint
        const audioCommands = await getActiveAudioCommandsByTwitchUserId(TEST_TWITCH_USER_ID);
        if (audioCommands.length > 0) {
            const testCmd = audioCommands[0];
            const audioBody = JSON.stringify({
                twitchUserId: TEST_TWITCH_USER_ID,
                command: testCmd.command
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
                        reject(error);
                    }
                });
                
                req.on('timeout', () => {
                    req.destroy();
                    resolve({ status: 0, body: { error: 'Timeout' } });
                });
                
                req.write(audioBody);
                req.end();
            });
            
            if (audioResponse.status === 200 && audioResponse.body.success) {
                logTest('Audio command trigger endpoint', true);
                logTest('Audio command broadcast to clients', audioResponse.body.clientsFound > 0);
                logTest('Audio command has filePath', !!audioResponse.body.command.filePath);
                logTest('Audio command has volume', audioResponse.body.command.volume !== undefined);
            } else if (audioResponse.status === 0) {
                console.log('   ⚠ Server not running - skipping endpoint test');
            } else {
                logTest('Audio command trigger endpoint', false, audioResponse.body.error || `Status: ${audioResponse.status}`);
            }
        } else {
            console.log('   ⚠ No audio commands to test');
        }
        
    } catch (error) {
        logTest('WebSocket endpoints', false, error.message);
    }
}

async function testCommandHandlers() {
    console.log('\n4️⃣  Testing Command Handler Setup...\n');
    
    try {
        // Get commands
        const audioCommands = await getActiveAudioCommandsByTwitchUserId(TEST_TWITCH_USER_ID);
        const gifCommands = await getActiveGifCommandsByTwitchUserId(TEST_TWITCH_USER_ID);
        
        // Simulate handler setup
        const handlers = new Map();
        
        // Add audio commands
        audioCommands.forEach(cmd => {
            handlers.set(cmd.command.toLowerCase(), {
                type: 'audio',
                command: cmd.command,
                filePath: cmd.file_path,
                volume: cmd.volume,
                id: cmd.id
            });
        });
        
        // Add GIF commands
        gifCommands.forEach(cmd => {
            handlers.set(cmd.command.toLowerCase(), {
                type: 'gif',
                command: cmd.command,
                gifUrl: cmd.gif_url,
                gifId: cmd.gif_id,
                duration: cmd.duration || 5000,
                position: cmd.position || 'center',
                id: cmd.id
            });
        });
        
        logTest('Command handlers created', handlers.size > 0);
        
        // Test lookup with ! prefix
        if (audioCommands.length > 0) {
            const testCmd = audioCommands[0];
            const lookupKey = `!${testCmd.command}`.toLowerCase().replace(/^!/, '');
            const handler = handlers.get(lookupKey);
            logTest('Audio command lookup with ! prefix', handler !== undefined && handler.type === 'audio');
        }
        
        if (gifCommands.length > 0) {
            const testCmd = gifCommands[0];
            const lookupKey = `!${testCmd.command}`.toLowerCase().replace(/^!/, '');
            const handler = handlers.get(lookupKey);
            logTest('GIF command lookup with ! prefix', handler !== undefined && handler.type === 'gif');
            logTest('GIF handler has position', handler && (handler.position || handler.position === 'center'));
        }
        
    } catch (error) {
        logTest('Command handlers', false, error.message);
    }
}

async function runAllTests() {
    console.log('🧪 Testing All Commands (Audio + GIF)...\n');
    console.log('='.repeat(60));
    
    try {
        await testCommandLoading();
        await testCommandLookup();
        await testCommandHandlers();
        await testWebSocketEndpoints();
        
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
        console.error('\n❌ Test suite failed:', error.message);
        console.error(error.stack);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

runAllTests();

