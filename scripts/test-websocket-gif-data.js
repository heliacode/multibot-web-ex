/**
 * Test script to verify WebSocket message structure for GIF commands
 * This simulates what the OBS source receives
 */

import WebSocket from 'ws';
import pool from '../config/database.js';
import { getObsTokenByToken } from '../models/obsToken.js';
import { getUserByTwitchId } from '../models/user.js';
import { processBitsDonation } from '../services/twitchChat.js';

const TEST_TWITCH_USER_ID = '25019517';
const WS_URL = 'ws://localhost:3000';

async function testWebSocketGifData() {
    console.log('🧪 Testing WebSocket GIF Command Data Structure...\n');
    console.log('='.repeat(60));
    
    try {
        // Get user and OBS token
        const user = await getUserByTwitchId(TEST_TWITCH_USER_ID);
        if (!user) {
            console.log('⚠️  Test user not found');
            return;
        }
        
        const tokenResult = await pool.query(
            'SELECT token FROM obs_tokens WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1',
            [user.id]
        );
        
        if (tokenResult.rows.length === 0) {
            console.log('⚠️  No OBS token found');
            return;
        }
        
        const token = tokenResult.rows[0].token;
        
        // Connect WebSocket
        const ws = new WebSocket(`${WS_URL}?token=${encodeURIComponent(token)}`);
        
        let receivedMessage = null;
        let messageReceived = false;
        
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
                        clearTimeout(timeout);
                        console.log('   ✅ WebSocket authenticated');
                        resolve();
                    } else if (message.type === 'command_trigger') {
                        messageReceived = true;
                        receivedMessage = message;
                        console.log('\n📨 Received command_trigger message:');
                        console.log(JSON.stringify(message, null, 2));
                        
                        if (message.command && message.command.type === 'gif_command') {
                            console.log('\n🎯 GIF Command Data:');
                            console.log(`   Position: "${message.command.position}"`);
                            console.log(`   Size: "${message.command.size}"`);
                            console.log(`   GIF URL: ${message.command.gifUrl}`);
                            
                            // Verify position and size are present
                            if (message.command.position && message.command.size) {
                                console.log('\n✅ Position and size are present in WebSocket message!');
                            } else {
                                console.log('\n❌ Position or size missing!');
                                console.log(`   Position: ${message.command.position}`);
                                console.log(`   Size: ${message.command.size}`);
                            }
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
        
        // Trigger a bits donation
        console.log('\n🔄 Triggering bits donation...\n');
        await processBitsDonation(TEST_TWITCH_USER_ID, 100, 'test_user');
        
        // Wait for message
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        if (messageReceived && receivedMessage) {
            console.log('\n✅ Test completed successfully!');
            console.log('\n📋 Message Structure:');
            console.log(`   Type: ${receivedMessage.type}`);
            console.log(`   Command Type: ${receivedMessage.command?.type}`);
            console.log(`   Position: "${receivedMessage.command?.position}"`);
            console.log(`   Size: "${receivedMessage.command?.size}"`);
        } else {
            console.log('\n⚠️  No command_trigger message received');
        }
        
        ws.close();
        await pool.end();
        
    } catch (error) {
        console.error('\n❌ Test failed:', error.message);
        console.error(error.stack);
        await pool.end();
        process.exit(1);
    }
}

testWebSocketGifData();

