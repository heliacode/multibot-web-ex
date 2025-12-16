import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { requireAuth, optionalAuth } from '../../middleware/auth.js';

describe('Auth Middleware', () => {
  describe('requireAuth', () => {
    let req, res, next;

    beforeEach(() => {
      req = {
        session: {},
        url: '/dashboard',
        path: '/dashboard',
        originalUrl: '/dashboard'
      };
      res = {
        redirect: jest.fn(),
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      next = jest.fn();
    });

    it('should call next() if user is authenticated', () => {
      req.session.userId = '12345';
      
      requireAuth(req, res, next);
      
      expect(next).toHaveBeenCalled();
      expect(res.redirect).not.toHaveBeenCalled();
    });

    it('should redirect if user is not authenticated', () => {
      requireAuth(req, res, next);
      
      expect(res.redirect).toHaveBeenCalledWith('/');
      expect(next).not.toHaveBeenCalled();
    });

    it('should redirect if session does not exist', () => {
      req.session = null;
      
      requireAuth(req, res, next);
      
      expect(res.redirect).toHaveBeenCalledWith('/');
    });
  });

  describe('optionalAuth', () => {
    let req, res, next;

    beforeEach(() => {
      req = {};
      res = {};
      next = jest.fn();
    });

    it('should always call next()', () => {
      optionalAuth(req, res, next);
      
      expect(next).toHaveBeenCalled();
    });

    it('should add user info to req if authenticated', () => {
      req.session = {
        userId: '12345',
        username: 'testuser',
        displayName: 'Test User',
        profileImageUrl: 'https://example.com/image.jpg'
      };
      
      optionalAuth(req, res, next);
      
      expect(req.user).toBeDefined();
      expect(req.user.id).toBe('12345');
      expect(req.user.username).toBe('testuser');
      expect(req.user.displayName).toBe('Test User');
      expect(req.user.profileImageUrl).toBe('https://example.com/image.jpg');
    });

    it('should not add user info if not authenticated', () => {
      req.session = {};
      
      optionalAuth(req, res, next);
      
      expect(req.user).toBeUndefined();
    });

    it('should handle missing session gracefully', () => {
      optionalAuth(req, res, next);
      
      expect(next).toHaveBeenCalled();
      expect(req.user).toBeUndefined();
    });
  });
});

