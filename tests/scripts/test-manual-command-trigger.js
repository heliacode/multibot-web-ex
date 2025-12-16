/**
 * Manually test command trigger broadcasting
 */

import pool from '../../config/database.js';
import { getActiveGifCommandsByTwitchUserId } from '../../models/gifCommand.js';

const TEST_TWITCH_USER_ID = '25019517';

async function testManualTrigger() {
  console.log('🧪 Testing Manual Command Trigger...\n');
  
  try {
    // Get GIF commands
    const gifCommands = await getActiveGifCommandsByTwitchUserId(TEST_TWITCH_USER_ID);
    if (gifCommands.length === 0) {
      throw new Error('No GIF commands found');
    }
    
    const testCommand = gifCommands[0];
    console.log(`Using command: !${testCommand.command}`);
    console.log(`GIF URL: ${testCommand.gif_url}\n`);
    
    // Get WebSocket server from global
    if (!global.wss) {
      throw new Error('WebSocket server not available (server not running?)');
    }
    
    console.log(`Total WebSocket clients: ${global.wss.clients.size}`);
    
    // Check each client
    let foundClients = 0;
    global.wss.clients.forEach((client) => {
      console.log(`\nClient:`);
      console.log(`  - userId: ${client.userId}`);
      console.log(`  - isObsSource: ${client.isObsSource}`);
      console.log(`  - isAuthenticated: ${client.isAuthenticated}`);
      console.log(`  - readyState: ${client.readyState} (1=OPEN)`);
      
      if (client.userId && 
          String(client.userId) === String(TEST_TWITCH_USER_ID) && 
          client.readyState === 1 && 
          client.isAuthenticated) {
        foundClients++;
        
        // Send command trigger
        const message = {
          type: 'command_trigger',
          command: {
            type: 'gif_command',
            command: testCommand.command,
            gifUrl: testCommand.gif_url,
            gifId: testCommand.gif_id,
            duration: testCommand.duration || 5000,
            id: testCommand.id
          }
        };
        
        console.log(`\n  ✓ Sending command trigger to this client...`);
        client.send(JSON.stringify(message));
        console.log(`  ✓ Message sent!`);
      }
    });
    
    if (foundClients === 0) {
      console.log(`\n⚠️  No matching WebSocket clients found for user ${TEST_TWITCH_USER_ID}`);
      console.log(`   Make sure the OBS source is open and authenticated`);
    } else {
      console.log(`\n✓ Sent command trigger to ${foundClients} client(s)`);
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

testManualTrigger();

