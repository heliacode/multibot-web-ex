/**
 * Integration test for simulate-command endpoint
 * Tests that the endpoint correctly processes commands
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { processCommand } from '../../services/twitchChat.js';
import pool from '../../config/database.js';
import { getActiveAudioCommandsByTwitchUserId } from '../../models/audioCommand.js';
import { getActiveGifCommandsByTwitchUserId } from '../../models/gifCommand.js';

const TEST_TWITCH_USER_ID = '25019517';

describe('Simulate Command Integration Tests', () => {
  beforeAll(async () => {
    // Any setup needed
  });
  
  afterAll(async () => {
    await pool.end();
  });
  
  describe('processCommand function', () => {
    it('should process audio commands correctly', async () => {
      const commands = await getActiveAudioCommandsByTwitchUserId(TEST_TWITCH_USER_ID);
      
      if (commands.length > 0) {
        const testCmd = commands[0];
        const result = await processCommand(TEST_TWITCH_USER_ID, `!${testCmd.command}`);
        
        expect(result).not.toBeNull();
        expect(result.type).toBe('audio');
        expect(result.command).toBe(testCmd.command);
      }
    });
    
    it('should process GIF commands correctly', async () => {
      const commands = await getActiveGifCommandsByTwitchUserId(TEST_TWITCH_USER_ID);
      
      if (commands.length > 0) {
        const testCmd = commands[0];
        const result = await processCommand(TEST_TWITCH_USER_ID, `!${testCmd.command}`);
        
        expect(result).not.toBeNull();
        expect(result.type).toBe('gif');
        expect(result.command).toBe(testCmd.command);
      }
    });
    
    it('should return null for non-existent commands', async () => {
      const result = await processCommand(TEST_TWITCH_USER_ID, '!nonexistentcommand12345');
      expect(result).toBeNull();
    });
    
    it('should handle commands without ! prefix', async () => {
      const commands = await getActiveAudioCommandsByTwitchUserId(TEST_TWITCH_USER_ID);
      
      if (commands.length > 0) {
        const testCmd = commands[0];
        // processCommand expects ! prefix, so this should return null
        const result = await processCommand(TEST_TWITCH_USER_ID, testCmd.command);
        expect(result).toBeNull();
      }
    });
  });
});

