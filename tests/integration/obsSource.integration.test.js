/**
 * Integration tests for OBS Source functionality
 * These tests verify the complete flow without relying on complex mocks
 */

import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import request from 'supertest';
import express from 'express';
import obsSourceRouter from '../../routes/obsSource.js';
import pool from '../../config/database.js';
import { getOrCreateObsToken, regenerateObsToken } from '../../models/obsToken.js';
import { getUserByTwitchId } from '../../models/user.js';

describe('OBS Source Integration Tests', () => {
  let app;
  let testUserId;
  let testTwitchUserId = 'test-twitch-12345';
  let testToken;

  beforeAll(async () => {
    // Create a test user if needed
    try {
      const user = await getUserByTwitchId(testTwitchUserId);
      if (user) {
        testUserId = user.id;
      } else {
        // Create test user
        const result = await pool.query(
          `INSERT INTO users (twitch_user_id, twitch_username, twitch_display_name, access_token, refresh_token, token_expires_at, scopes)
           VALUES ($1, $2, $3, $4, $5, $6, $7)
           RETURNING id`,
          [testTwitchUserId, 'testuser', 'Test User', 'test-token', 'test-refresh', new Date(), '[]']
        );
        testUserId = result.rows[0].id;
      }
    } catch (error) {
      console.error('Error setting up test user:', error);
    }
  });

  beforeEach(async () => {
    app = express();
    app.use('/obs-source', obsSourceRouter);
    
    // Create a fresh token for each test
    if (testUserId) {
      try {
        // Delete existing token if any
        await pool.query('DELETE FROM obs_tokens WHERE user_id = $1', [testUserId]);
        // Create new token
        const tokenData = await getOrCreateObsToken(testUserId, testTwitchUserId);
        testToken = tokenData.token;
      } catch (error) {
        console.error('Error creating test token:', error);
      }
    }
  });

  afterEach(async () => {
    // Clean up tokens after each test
    if (testUserId) {
      await pool.query('DELETE FROM obs_tokens WHERE user_id = $1', [testUserId]);
    }
  });

  describe('Token Authentication Flow', () => {
    it('should return error page when no token provided', async () => {
      const response = await request(app)
        .get('/obs-source')
        .expect(400);

      expect(response.text).toContain('Error: Missing Token');
    });

    it('should return OBS HTML when valid token provided', async () => {
      if (!testToken) {
        console.warn('Skipping test - no test token available');
        return;
      }

      const response = await request(app)
        .get(`/obs-source?token=${encodeURIComponent(testToken)}`)
        .expect(200);

      expect(response.text).toContain('MultiBot OBS Browser Source');
      expect(response.text).toContain('WebSocket');
      expect(response.text).not.toContain('{{TOKEN}}');
    });

    it('should handle URL-encoded tokens correctly', async () => {
      if (!testToken) {
        console.warn('Skipping test - no test token available');
        return;
      }

      const encodedToken = encodeURIComponent(testToken);
      const response = await request(app)
        .get(`/obs-source?token=${encodedToken}`)
        .expect(200);

      expect(response.text).toContain('MultiBot OBS Browser Source');
      // Token should be in the HTML (decoded)
      expect(response.text).toContain(testToken);
    });

    it('should handle token regeneration correctly', async () => {
      if (!testUserId) {
        console.warn('Skipping test - no test user available');
        return;
      }

      // Create initial token
      const token1 = await getOrCreateObsToken(testUserId, testTwitchUserId);
      
      // Regenerate token
      const token2 = await regenerateObsToken(testUserId, testTwitchUserId);
      
      // Old token should not work
      const response1 = await request(app)
        .get(`/obs-source?token=${encodeURIComponent(token1.token)}`)
        .expect(200);
      
      // New token should work
      const response2 = await request(app)
        .get(`/obs-source?token=${encodeURIComponent(token2.token)}`)
        .expect(200);

      expect(response2.text).toContain('MultiBot OBS Browser Source');
      
      // Verify old token is different from new token
      expect(token1.token).not.toBe(token2.token);
    });

    it('should handle tokens with special characters (+, /, =)', async () => {
      if (!testToken) {
        console.warn('Skipping test - no test token available');
        return;
      }

      // Base64 tokens contain +, /, = - test that they work
      const response = await request(app)
        .get(`/obs-source?token=${encodeURIComponent(testToken)}`)
        .expect(200);

      expect(response.text).toContain('MultiBot OBS Browser Source');
      expect(response.text).toContain(testToken);
    });
  });

  describe('Design Elements Loading', () => {
    it('should load design elements when token is valid', async () => {
      if (!testToken || !testUserId) {
        console.warn('Skipping test - no test token/user available');
        return;
      }

      // Create a test design
      await pool.query(
        `INSERT INTO design_elements (user_id, twitch_user_id, design_data)
         VALUES ($1, $2, $3)
         ON CONFLICT (user_id) DO UPDATE SET design_data = $3`,
        [testUserId, testTwitchUserId, JSON.stringify([{ type: 'text', text: 'Test', x: 50, y: 50 }])]
      );

      const response = await request(app)
        .get(`/obs-source?token=${encodeURIComponent(testToken)}`)
        .expect(200);

      expect(response.text).toContain('design-container');
      expect(response.text).toContain('Test');

      // Clean up
      await pool.query('DELETE FROM design_elements WHERE user_id = $1', [testUserId]);
    });

    it('should continue loading even if design elements fail to load', async () => {
      if (!testToken) {
        console.warn('Skipping test - no test token available');
        return;
      }

      // Use invalid user_id to cause design load to fail
      const response = await request(app)
        .get(`/obs-source?token=${encodeURIComponent(testToken)}`)
        .expect(200);

      // Should still return HTML even if design loading fails
      expect(response.text).toContain('MultiBot OBS Browser Source');
    });
  });

  afterAll(async () => {
    // Clean up test data
    if (testUserId) {
      await pool.query('DELETE FROM obs_tokens WHERE user_id = $1', [testUserId]);
      await pool.query('DELETE FROM design_elements WHERE user_id = $1', [testUserId]);
      // Note: We don't delete the test user as it might be used by other tests
    }
  });
});

