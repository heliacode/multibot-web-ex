import { twitchConfig } from '../../config/twitch.js';

describe('Twitch Configuration', () => {
  it('should have all required configuration properties', () => {
    expect(twitchConfig).toHaveProperty('clientId');
    expect(twitchConfig).toHaveProperty('clientSecret');
    expect(twitchConfig).toHaveProperty('redirectUri');
    expect(twitchConfig).toHaveProperty('scopes');
    expect(twitchConfig).toHaveProperty('authUrl');
    expect(twitchConfig).toHaveProperty('tokenUrl');
    expect(twitchConfig).toHaveProperty('validateUrl');
    expect(twitchConfig).toHaveProperty('apiUrl');
  });

  it('should have correct API URLs', () => {
    expect(twitchConfig.authUrl).toBe('https://id.twitch.tv/oauth2/authorize');
    expect(twitchConfig.tokenUrl).toBe('https://id.twitch.tv/oauth2/token');
    expect(twitchConfig.validateUrl).toBe('https://id.twitch.tv/oauth2/validate');
    expect(twitchConfig.apiUrl).toBe('https://api.twitch.tv/helix');
  });

  it('should have required OAuth scopes', () => {
    expect(Array.isArray(twitchConfig.scopes)).toBe(true);
    expect(twitchConfig.scopes.length).toBeGreaterThan(0);
    expect(twitchConfig.scopes).toContain('chat:read');
    expect(twitchConfig.scopes).toContain('chat:edit');
    expect(twitchConfig.scopes).toContain('channel:moderate');
    expect(twitchConfig.scopes).toContain('bits:read');
  });

  it('should have default redirect URI if not set', () => {
    expect(twitchConfig.redirectUri).toBeDefined();
    expect(typeof twitchConfig.redirectUri).toBe('string');
  });
});

