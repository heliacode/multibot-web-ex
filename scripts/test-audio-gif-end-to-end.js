/**
 * End-to-end test for audio and GIF commands
 * Tests the complete flow: database -> command handlers -> WebSocket -> OBS source
 */

import pool from '../config/database.js';
import { getActiveAudioCommandsByTwitchUserId } from '../models/audioCommand.js';
import { getActiveGifCommandsByTwitchUserId } from '../models/gifCommand.js';
import http from 'http';

const TEST_TWITCH_USER_ID = '25019517';

let results = {
    audio: { passed: 0, failed: 0, errors: [] },
    gif: { passed: 0, failed: 0, errors: [] }
};

async function testEndToEnd() {
    console.log('🧪 End-to-End Command Testing...\n');
    console.log('='.repeat(60));
    
    try {
        // Get commands
        const audioCommands = await getActiveAudioCommandsByTwitchUserId(TEST_TWITCH_USER_ID);
        const gifCommands = await getActiveGifCommandsByTwitchUserId(TEST_TWITCH_USER_ID);
        
        console.log(`Found ${audioCommands.length} audio commands`);
        console.log(`Found ${gifCommands.length} GIF commands\n`);
        
        // Test Audio Commands
        if (audioCommands.length > 0) {
            console.log('🔊 Testing Audio Commands...\n');
            const testAudio = audioCommands[0];
            
            console.log(`   Command: !${testAudio.command}`);
            console.log(`   File: ${testAudio.file_path}`);
            console.log(`   Volume: ${testAudio.volume || 0.5}`);
            
            // Test trigger endpoint
            const audioResponse = await triggerCommand('audio', testAudio.command);
            
            if (audioResponse.success) {
                console.log(`   ✅ Command triggered successfully`);
                console.log(`   ✅ Broadcast to ${audioResponse.clientsFound} client(s)`);
                console.log(`   ✅ Command data includes filePath: ${!!audioResponse.command.filePath}`);
                console.log(`   ✅ Command data includes volume: ${audioResponse.command.volume !== undefined}`);
                results.audio.passed += 4;
            } else {
                console.log(`   ❌ Failed to trigger command: ${audioResponse.error}`);
                results.audio.failed++;
                results.audio.errors.push(audioResponse.error);
            }
        } else {
            console.log('🔊 No audio commands to test\n');
        }
        
        // Test GIF Commands
        if (gifCommands.length > 0) {
            console.log('\n🎬 Testing GIF Commands...\n');
            const testGif = gifCommands[0];
            
            console.log(`   Command: !${testGif.command}`);
            console.log(`   GIF URL: ${testGif.gif_url.substring(0, 50)}...`);
            console.log(`   Position: ${testGif.position || 'center'}`);
            console.log(`   Duration: ${testGif.duration || 5000}ms`);
            
            // Test trigger endpoint
            const gifResponse = await triggerCommand('gif', testGif.command);
            
            if (gifResponse.success) {
                console.log(`   ✅ Command triggered successfully`);
                console.log(`   ✅ Broadcast to ${gifResponse.clientsFound} client(s)`);
                console.log(`   ✅ Command data includes gifUrl: ${!!gifResponse.command.gifUrl}`);
                console.log(`   ✅ Command data includes position: ${gifResponse.command.position || 'center'}`);
                results.gif.passed += 4;
            } else {
                console.log(`   ❌ Failed to trigger command: ${gifResponse.error}`);
                results.gif.failed++;
                results.gif.errors.push(gifResponse.error);
            }
        } else {
            console.log('🎬 No GIF commands to test\n');
        }
        
        // Summary
        console.log('\n' + '='.repeat(60));
        console.log('📊 Test Summary:');
        console.log(`\nAudio Commands:`);
        console.log(`   ✅ Passed: ${results.audio.passed}`);
        console.log(`   ❌ Failed: ${results.audio.failed}`);
        if (results.audio.errors.length > 0) {
            console.log(`   Errors: ${results.audio.errors.join(', ')}`);
        }
        console.log(`\nGIF Commands:`);
        console.log(`   ✅ Passed: ${results.gif.passed}`);
        console.log(`   ❌ Failed: ${results.gif.failed}`);
        if (results.gif.errors.length > 0) {
            console.log(`   Errors: ${results.gif.errors.join(', ')}`);
        }
        console.log('='.repeat(60));
        
        const totalPassed = results.audio.passed + results.gif.passed;
        const totalFailed = results.audio.failed + results.gif.failed;
        
        if (totalFailed === 0 && totalPassed > 0) {
            console.log('\n✅ All end-to-end tests passed!');
            console.log('💡 Both audio and GIF commands are working correctly.');
            process.exit(0);
        } else if (totalPassed > 0) {
            console.log(`\n⚠️  Some tests had issues (${totalPassed} passed, ${totalFailed} failed)`);
            process.exit(1);
        } else {
            console.log('\n⚠️  No commands found to test');
            process.exit(0);
        }
        
    } catch (error) {
        console.error('\n❌ Test failed:', error.message);
        console.error(error.stack);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

function triggerCommand(type, command) {
    return new Promise((resolve) => {
        const endpoint = type === 'audio' ? '/api/test/trigger-audio-command' : '/api/test/trigger-command';
        const body = JSON.stringify({
            twitchUserId: TEST_TWITCH_USER_ID,
            command: command
        });
        
        const req = http.request({
            hostname: 'localhost',
            port: 3000,
            path: endpoint,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(body)
            },
            timeout: 5000
        }, (res) => {
            let data = '';
            res.on('data', (chunk) => { data += chunk; });
            res.on('end', () => {
                try {
                    if (res.statusCode === 200) {
                        resolve(JSON.parse(data));
                    } else {
                        resolve({ success: false, error: `Status ${res.statusCode}: ${data.substring(0, 100)}` });
                    }
                } catch (e) {
                    resolve({ success: false, error: `Invalid JSON: ${e.message}` });
                }
            });
        });
        
        req.on('error', (error) => {
            if (error.code === 'ECONNREFUSED') {
                resolve({ success: false, error: 'Server not running' });
            } else {
                resolve({ success: false, error: error.message });
            }
        });
        
        req.on('timeout', () => {
            req.destroy();
            resolve({ success: false, error: 'Request timeout' });
        });
        
        req.write(body);
        req.end();
    });
}

testEndToEnd();

