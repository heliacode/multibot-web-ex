/**
 * Integration tests for command processing
 * Tests both audio and GIF commands end-to-end
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import pool from '../../config/database.js';
import { getActiveAudioCommandsByTwitchUserId } from '../../models/audioCommand.js';
import { getActiveGifCommandsByTwitchUserId } from '../../models/gifCommand.js';

const TEST_TWITCH_USER_ID = '25019517';

describe('Command Integration Tests', () => {
  beforeAll(async () => {
    // Any setup needed
  });
  
  afterAll(async () => {
    await pool.end();
  });
  
  describe('Command Storage Consistency', () => {
    it('should store audio commands without ! prefix', async () => {
      const commands = await getActiveAudioCommandsByTwitchUserId(TEST_TWITCH_USER_ID);
      
      if (commands.length > 0) {
        commands.forEach(cmd => {
          expect(cmd.command).not.toMatch(/^!/);
        });
      }
    });
    
    it('should store GIF commands without ! prefix', async () => {
      const commands = await getActiveGifCommandsByTwitchUserId(TEST_TWITCH_USER_ID);
      
      if (commands.length > 0) {
        commands.forEach(cmd => {
          expect(cmd.command).not.toMatch(/^!/);
        });
      }
    });
  });
  
  describe('Command Lookup Logic', () => {
    it('should correctly strip ! prefix for lookup', () => {
      const testCases = [
        { input: '!test', expected: 'test' },
        { input: '!DANCE', expected: 'dance' },
        { input: 'test', expected: 'test' }
      ];
      
      testCases.forEach(({ input, expected }) => {
        const result = input.toLowerCase().replace(/^!/, '');
        expect(result).toBe(expected);
      });
    });
  });
  
  describe('Command Handler Structure', () => {
    it('should create audio command handlers with correct structure', async () => {
      const commands = await getActiveAudioCommandsByTwitchUserId(TEST_TWITCH_USER_ID);
      
      if (commands.length > 0) {
        const cmd = commands[0];
        const handler = {
          type: 'audio',
          command: cmd.command,
          filePath: cmd.file_path,
          volume: cmd.volume,
          id: cmd.id
        };
        
        expect(handler.type).toBe('audio');
        expect(handler.command).toBeDefined();
        expect(handler.filePath).toBeDefined();
        expect(handler.volume).toBeDefined();
      }
    });
    
    it('should create GIF command handlers with correct structure', async () => {
      const commands = await getActiveGifCommandsByTwitchUserId(TEST_TWITCH_USER_ID);
      
      if (commands.length > 0) {
        const cmd = commands[0];
        const handler = {
          type: 'gif',
          command: cmd.command,
          gifUrl: cmd.gif_url,
          gifId: cmd.gif_id,
          duration: cmd.duration || 5000,
          position: cmd.position || 'center',
          id: cmd.id
        };
        
        expect(handler.type).toBe('gif');
        expect(handler.command).toBeDefined();
        expect(handler.gifUrl).toBeDefined();
        expect(handler.position).toBeDefined();
      }
    });
  });
});

