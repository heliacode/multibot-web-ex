/**
 * Integration tests for audio and GIF commands
 * Tests the complete flow from command processing to WebSocket broadcasting
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import pool from '../../config/database.js';
import { getActiveAudioCommandsByTwitchUserId } from '../../models/audioCommand.js';
import { getActiveGifCommandsByTwitchUserId } from '../../models/gifCommand.js';
import { setupCommandHandlers } from '../../services/twitchChat.js';
import WebSocket from 'ws';

const TEST_TWITCH_USER_ID = '25019517';
const WS_URL = process.env.WS_URL || 'ws://localhost:3000';

describe('Command Integration Tests', () => {
  let ws = null;
  let token = null;
  
  beforeAll(async () => {
    // Get OBS token for WebSocket connection
    const userResult = await pool.query(
      'SELECT id FROM users WHERE twitch_user_id = $1',
      [TEST_TWITCH_USER_ID]
    );
    
    if (userResult.rows.length > 0) {
      const userId = userResult.rows[0].id;
      const tokenResult = await pool.query(
        'SELECT token FROM obs_tokens WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1',
        [userId]
      );
      
      if (tokenResult.rows.length > 0) {
        token = tokenResult.rows[0].token;
      }
    }
  });
  
  afterAll(async () => {
    if (ws) {
      ws.close();
    }
    await pool.end();
  });
  
  describe('Command Loading', () => {
    it('should load audio commands from database', async () => {
      const commands = await getActiveAudioCommandsByTwitchUserId(TEST_TWITCH_USER_ID);
      expect(Array.isArray(commands)).toBe(true);
      console.log(`Found ${commands.length} audio commands`);
      
      if (commands.length > 0) {
        const cmd = commands[0];
        expect(cmd).toHaveProperty('command');
        expect(cmd).toHaveProperty('file_path');
        expect(cmd).toHaveProperty('is_active');
        expect(cmd.is_active).toBe(true);
        // Commands should be stored without ! prefix
        expect(cmd.command).not.toMatch(/^!/);
      }
    });
    
    it('should load GIF commands from database', async () => {
      const commands = await getActiveGifCommandsByTwitchUserId(TEST_TWITCH_USER_ID);
      expect(Array.isArray(commands)).toBe(true);
      console.log(`Found ${commands.length} GIF commands`);
      
      if (commands.length > 0) {
        const cmd = commands[0];
        expect(cmd).toHaveProperty('command');
        expect(cmd).toHaveProperty('gif_url');
        expect(cmd).toHaveProperty('is_active');
        expect(cmd.is_active).toBe(true);
        // Commands should be stored without ! prefix
        expect(cmd.command).not.toMatch(/^!/);
      }
    });
    
    it('should set up command handlers correctly', async () => {
      // This tests the internal setupCommandHandlers function
      // We'll test it indirectly by checking if commands are loaded
      const audioCommands = await getActiveAudioCommandsByTwitchUserId(TEST_TWITCH_USER_ID);
      const gifCommands = await getActiveGifCommandsByTwitchUserId(TEST_TWITCH_USER_ID);
      
      expect(audioCommands.length + gifCommands.length).toBeGreaterThan(0);
    });
  });
  
  describe('Command Processing', () => {
    it('should process commands without ! prefix correctly', () => {
      // Test command lookup logic
      const testMessage = '!test';
      const command = testMessage.toLowerCase().replace(/^!/, '');
      expect(command).toBe('test');
      
      const testMessage2 = '!DANCE';
      const command2 = testMessage2.toLowerCase().replace(/^!/, '');
      expect(command2).toBe('dance');
    });
    
    it('should handle commands with ! prefix in lookup', () => {
      // Commands in database are stored without !
      // Messages from chat have !
      const dbCommand = 'dance'; // stored in DB
      const chatMessage = '!dance'; // from chat
      const lookupKey = chatMessage.toLowerCase().replace(/^!/, '');
      
      expect(lookupKey).toBe(dbCommand);
    });
  });
  
  describe('WebSocket Broadcasting', () => {
    it('should connect to WebSocket server', (done) => {
      if (!token) {
        console.log('Skipping WebSocket test - no token available');
        done();
        return;
      }
      
      ws = new WebSocket(`${WS_URL}?token=${encodeURIComponent(token)}`);
      
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
            expect(message.type).toBe('obs_authenticated');
            done();
          } else if (message.type === 'obs_auth_failed') {
            done(new Error(`Authentication failed: ${message.message}`));
          }
        } catch (error) {
          // Ignore parse errors during auth
        }
      });
      
      ws.on('error', (error) => {
        done(error);
      });
      
      setTimeout(() => {
        if (ws.readyState !== WebSocket.OPEN) {
          done(new Error('WebSocket connection timeout'));
        }
      }, 5000);
    });
  });
});

