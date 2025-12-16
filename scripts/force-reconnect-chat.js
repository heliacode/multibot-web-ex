/**
 * Force reconnect chat to ensure message handler is set up
 */

import { disconnectFromChat, connectToChat } from '../services/twitchChat.js';
import pool from '../config/database.js';

const TEST_TWITCH_USER_ID = '25019517';

async function forceReconnect() {
  console.log('🔄 Forcing chat reconnection...\n');
  
  try {
    // Get user info
    const userResult = await pool.query(
      'SELECT twitch_username, access_token FROM users WHERE twitch_user_id = $1',
      [TEST_TWITCH_USER_ID]
    );
    
    if (userResult.rows.length === 0) {
      throw new Error(`User ${TEST_TWITCH_USER_ID} not found`);
    }
    
    const user = userResult.rows[0];
    console.log(`Found user: ${user.twitch_username}`);
    
    // Disconnect if connected
    console.log('\n1. Disconnecting...');
    await disconnectFromChat(TEST_TWITCH_USER_ID);
    console.log('   ✓ Disconnected');
    
    // Wait a bit
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Reconnect
    console.log('\n2. Reconnecting...');
    await connectToChat(TEST_TWITCH_USER_ID, user.twitch_username, user.access_token);
    console.log('   ✓ Reconnected');
    
    console.log('\n✅ Chat reconnected! Message handler should now be active.');
    console.log('💡 Try typing !dance in your Twitch chat now.');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

forceReconnect();

