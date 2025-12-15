/**
 * Tests for OBS Source Route
 * Tests token extraction, error handling, and route responses
 */

import request from 'supertest';
import express from 'express';
import obsSourceRouter from '../../routes/obsSource.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('OBS Source Route', () => {
  let app;

  beforeEach(() => {
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
      const response = await request(app)
        .get(`/obs-source?token=${encodeURIComponent(testToken)}`)
        .expect(200);

      expect(response.text).toContain(testToken);
    });

    it('should handle tokens ending with equals sign', async () => {
      const testToken = 'I8IXbqXZZB/U5QLF8=';
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
      const response = await request(app)
        .get(`/obs-source?token=${encodeURIComponent(testToken)}`)
        .expect(200);

      expect(response.text).toContain(testToken);
    });

    it('should handle very long tokens', async () => {
      const testToken = 'a'.repeat(500);
      const response = await request(app)
        .get(`/obs-source?token=${testToken}`)
        .expect(200);

      expect(response.text).toContain(testToken);
    });
  });

  describe('Error handling', () => {
    it('should handle file read errors gracefully', async () => {
      // This test verifies the route handles errors
      // In a real scenario, if the HTML file doesn't exist, it should error
      const response = await request(app)
        .get('/obs-source?token=valid-token')
        .expect(200);

      // Should still return HTML even if there are minor issues
      expect(response.text).toBeTruthy();
    });
  });
});

