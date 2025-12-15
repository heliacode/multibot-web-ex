import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { generateState } from '../../services/twitchAuth.js';

// Mock the services
jest.mock('../../services/twitchAuth.js', () => ({
  generateAuthUrl: jest.fn((state) => `https://id.twitch.tv/oauth2/authorize?state=${state}`),
  handleOAuthCallback: jest.fn(),
  generateState: jest.fn(() => 'mock-state-123')
}));

import { initiateAuth, handleCallback, logout } from '../../controllers/authController.js';
import * as twitchAuth from '../../services/twitchAuth.js';

describe('Auth Controller', () => {
  describe('initiateAuth', () => {
    let req, res;

    beforeEach(() => {
      req = {
        session: {}
      };
      res = {
        redirect: jest.fn()
      };
    });

    it('should generate state and store in session', () => {
      initiateAuth(req, res);
      
      expect(req.session.oauthState).toBe('mock-state-123');
      expect(twitchAuth.generateState).toHaveBeenCalled();
    });

    it('should redirect to Twitch auth URL', () => {
      initiateAuth(req, res);
      
      expect(twitchAuth.generateAuthUrl).toHaveBeenCalledWith('mock-state-123');
      expect(res.redirect).toHaveBeenCalledWith('https://id.twitch.tv/oauth2/authorize?state=mock-state-123');
    });
  });

  describe('handleCallback', () => {
    let req, res;

    beforeEach(() => {
      req = {
        query: {},
        session: {
          oauthState: 'mock-state-123'
        }
      };
      res = {
        redirect: jest.fn()
      };
    });

    it('should redirect with error if OAuth error is present', async () => {
      req.query.error = 'access_denied';
      
      await handleCallback(req, res);
      
      expect(res.redirect).toHaveBeenCalledWith('/?error=access_denied');
      expect(twitchAuth.handleOAuthCallback).not.toHaveBeenCalled();
    });

    it('should redirect with error if state mismatch', async () => {
      req.query.code = 'auth-code';
      req.query.state = 'different-state';
      
      await handleCallback(req, res);
      
      expect(res.redirect).toHaveBeenCalledWith('/?error=Invalid%20state%20parameter');
      expect(twitchAuth.handleOAuthCallback).not.toHaveBeenCalled();
    });

    it('should redirect with error if no code provided', async () => {
      req.query.state = 'mock-state-123';
      
      await handleCallback(req, res);
      
      expect(res.redirect).toHaveBeenCalledWith('/?error=No%20authorization%20code%20provided');
    });

    it('should handle successful OAuth callback', async () => {
      const mockUserData = {
        twitchUserId: '12345',
        username: 'testuser',
        displayName: 'Test User',
        profileImageUrl: 'https://example.com/image.jpg'
      };
      
      twitchAuth.handleOAuthCallback.mockResolvedValue(mockUserData);
      req.query.code = 'auth-code';
      req.query.state = 'mock-state-123';
      
      await handleCallback(req, res);
      
      expect(twitchAuth.handleOAuthCallback).toHaveBeenCalledWith('auth-code');
      expect(req.session.userId).toBe('12345');
      expect(req.session.username).toBe('testuser');
      expect(req.session.displayName).toBe('Test User');
      expect(req.session.oauthState).toBeUndefined();
      expect(res.redirect).toHaveBeenCalledWith('/dashboard');
    });

    it('should handle OAuth callback errors', async () => {
      twitchAuth.handleOAuthCallback.mockRejectedValue(new Error('OAuth failed'));
      req.query.code = 'auth-code';
      req.query.state = 'mock-state-123';
      
      await handleCallback(req, res);
      
      expect(res.redirect).toHaveBeenCalledWith('/?error=Authentication%20failed');
    });
  });

  describe('logout', () => {
    let req, res;

    beforeEach(() => {
      req = {
        session: {
          destroy: jest.fn((callback) => callback(null))
        }
      };
      res = {
        redirect: jest.fn()
      };
    });

    it('should destroy session and redirect to home', () => {
      logout(req, res);
      
      expect(req.session.destroy).toHaveBeenCalled();
      expect(res.redirect).toHaveBeenCalledWith('/');
    });

    it('should handle session destroy errors', () => {
      req.session.destroy = jest.fn((callback) => callback(new Error('Destroy failed')));
      
      logout(req, res);
      
      expect(res.redirect).toHaveBeenCalledWith('/?error=Logout%20failed');
    });
  });
});

