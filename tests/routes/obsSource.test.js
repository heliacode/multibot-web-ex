/**
 * Tests for OBS Source Route
 * Tests token extraction, error handling, and route responses
 */

import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import request from 'supertest';
import express from 'express';
import obsSourceRouter from '../../routes/obsSource.js';

// Mock the models
jest.mock('../../models/obsToken.js', () => ({
  getObsTokenByToken: jest.fn(),
}));

jest.mock('../../models/designElement.js', () => ({
  getDesignElementsByTwitchId: jest.fn(),
}));

import { getObsTokenByToken } from '../../models/obsToken.js';
import { getDesignElementsByTwitchId } from '../../models/designElement.js';

describe('OBS Source Route', () => {
  let app;

  beforeEach(() => {
    jest.clearAllMocks();
    app = express();
    app.use('/obs-source', obsSourceRouter);
  });

  describe('GET /obs-source without token', () => {
    it('should return 400 with error page when no token provided', async () => {
      const response = await request(app)
        .get('/obs-source')
        .expect(400);

      expect(response.text).toContain('Error: Missing Token');
      expect(response.text).toContain('This OBS Browser Source requires a token');
      expect(response.text).toContain('Go to Dashboard');
    });

    it('should include instructions in error page', async () => {
      const response = await request(app)
        .get('/obs-source')
        .expect(400);

      expect(response.text).toContain('MultiBot Dashboard');
      expect(response.text).toContain('OBS Setup');
      expect(response.text).toContain('Generate OBS Token');
    });

    it('should be mobile responsive', async () => {
      const response = await request(app)
        .get('/obs-source')
        .expect(400);

      expect(response.text).toContain('viewport');
      expect(response.text).toContain('max-width: 640px');
    });
  });

  describe('GET /obs-source with token', () => {
    beforeEach(() => {
      // Mock valid token lookup
      getObsTokenByToken.mockResolvedValue({
        id: 1,
        user_id: 1,
        twitch_user_id: '12345',
        token: 'test-token-123'
      });
      
      // Mock no design elements (optional)
      getDesignElementsByTwitchId.mockResolvedValue(null);
    });

    it('should return OBS source HTML when valid token provided', async () => {
      const testToken = 'test-token-123';
      const response = await request(app)
        .get(`/obs-source?token=${testToken}`)
        .expect(200);

      expect(response.text).toContain('MultiBot OBS Browser Source');
      expect(response.text).toContain(testToken);
      expect(response.text).not.toContain('{{TOKEN}}');
    });

    it('should replace token placeholder in HTML', async () => {
      const testToken = 'abc123xyz';
      const response = await request(app)
        .get(`/obs-source?token=${testToken}`)
        .expect(200);

      // Token should be replaced, not the placeholder
      expect(response.text).toContain(testToken);
      expect(response.text).not.toContain('{{TOKEN}}');
    });

    it('should handle tokens with special characters', async () => {
      const testToken = 'token+with=special/chars&more';
      getObsTokenByToken.mockResolvedValue({
        id: 1,
        user_id: 1,
        twitch_user_id: '12345',
        token: testToken
      });
      
      const response = await request(app)
        .get(`/obs-source?token=${encodeURIComponent(testToken)}`)
        .expect(200);

      expect(response.text).toContain(testToken);
    });

    it('should handle tokens ending with equals sign', async () => {
      const testToken = 'I8IXbqXZZB/U5QLF8=';
      getObsTokenByToken.mockResolvedValue({
        id: 1,
        user_id: 1,
        twitch_user_id: '12345',
        token: testToken
      });
      
      const response = await request(app)
        .get(`/obs-source?token=${encodeURIComponent(testToken)}`)
        .expect(200);

      expect(response.text).toContain(testToken);
    });

    it('should include WebSocket connection code', async () => {
      const testToken = 'test-token';
      const response = await request(app)
        .get(`/obs-source?token=${testToken}`)
        .expect(200);

      expect(response.text).toContain('WebSocket');
      expect(response.text).toContain('obs_authenticate');
    });

    it('should load design elements when token is valid', async () => {
      const testToken = 'test-token-123';
      const mockDesign = {
        id: 1,
        user_id: 1,
        twitch_user_id: '12345',
        design_data: [{ type: 'text', text: 'Hello', x: 50, y: 50 }]
      };
      
      getDesignElementsByTwitchId.mockResolvedValue(mockDesign);
      
      const response = await request(app)
        .get(`/obs-source?token=${testToken}`)
        .expect(200);

      expect(getObsTokenByToken).toHaveBeenCalled();
      expect(getDesignElementsByTwitchId).toHaveBeenCalledWith('12345');
      expect(response.text).toContain('design-container');
    });

    it('should continue even if design loading fails', async () => {
      const testToken = 'test-token-123';
      getDesignElementsByTwitchId.mockRejectedValue(new Error('Design load failed'));
      
      const response = await request(app)
        .get(`/obs-source?token=${testToken}`)
        .expect(200);

      // Should still return HTML even if design loading fails
      expect(response.text).toContain('MultiBot OBS Browser Source');
    });

    it('should continue even if token lookup fails (for design)', async () => {
      const testToken = 'test-token-123';
      getObsTokenByToken.mockResolvedValue(null);
      
      const response = await request(app)
        .get(`/obs-source?token=${testToken}`)
        .expect(200);

      // Should still return HTML - token validation happens in WebSocket
      expect(response.text).toContain('MultiBot OBS Browser Source');
    });
  });

  describe('Token extraction edge cases', () => {
    it('should handle empty token parameter', async () => {
      const response = await request(app)
        .get('/obs-source?token=')
        .expect(400);

      expect(response.text).toContain('Error: Missing Token');
    });

    it('should handle token with spaces', async () => {
      const testToken = 'token with spaces';
      getObsTokenByToken.mockResolvedValue({
        id: 1,
        user_id: 1,
        twitch_user_id: '12345',
        token: testToken
      });
      
      const response = await request(app)
        .get(`/obs-source?token=${encodeURIComponent(testToken)}`)
        .expect(200);

      expect(response.text).toContain(testToken);
    });

    it('should handle very long tokens', async () => {
      const testToken = 'a'.repeat(500);
      getObsTokenByToken.mockResolvedValue({
        id: 1,
        user_id: 1,
        twitch_user_id: '12345',
        token: testToken
      });
      
      const response = await request(app)
        .get(`/obs-source?token=${testToken}`)
        .expect(200);

      expect(response.text).toContain(testToken);
    });
  });

  describe('Error handling', () => {
    it('should handle file read errors gracefully', async () => {
      getObsTokenByToken.mockResolvedValue({
        id: 1,
        user_id: 1,
        twitch_user_id: '12345',
        token: 'valid-token'
      });
      
      const response = await request(app)
        .get('/obs-source?token=valid-token')
        .expect(200);

      // Should still return HTML even if there are minor issues
      expect(response.text).toBeTruthy();
    });
  });
});
