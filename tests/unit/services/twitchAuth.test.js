import { generateAuthUrl, generateState } from '../../services/twitchAuth.js';

describe('Twitch Auth Service', () => {
  describe('generateState', () => {
    it('should generate a random state string', () => {
      const state = generateState();
      
      expect(state).toBeDefined();
      expect(typeof state).toBe('string');
      expect(state.length).toBeGreaterThan(0);
    });

    it('should generate different states each time', () => {
      const state1 = generateState();
      const state2 = generateState();
      
      expect(state1).not.toBe(state2);
    });

    it('should generate a hex string', () => {
      const state = generateState();
      const hexRegex = /^[0-9a-f]+$/;
      
      expect(hexRegex.test(state)).toBe(true);
    });
  });

  describe('generateAuthUrl', () => {
    it('should generate a valid Twitch OAuth URL', () => {
      const state = generateState();
      const authUrl = generateAuthUrl(state);
      
      expect(authUrl).toBeDefined();
      expect(authUrl).toContain('https://id.twitch.tv/oauth2/authorize');
      expect(authUrl).toContain('client_id=');
      expect(authUrl).toContain('redirect_uri=');
      expect(authUrl).toContain('response_type=code');
      expect(authUrl).toContain('scope=');
      expect(authUrl).toContain(`state=${state}`);
    });

    it('should include state parameter in URL', () => {
      const state = 'test-state-123';
      const authUrl = generateAuthUrl(state);
      
      expect(authUrl).toContain(`state=${state}`);
    });

    it('should URL encode parameters', () => {
      const state = generateState();
      const authUrl = generateAuthUrl(state);
      
      // Check that spaces in scope are encoded
      expect(authUrl).toContain('scope=');
      expect(authUrl).not.toContain('scope=chat:read chat:edit');
    });
  });
});

