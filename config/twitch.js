import dotenv from 'dotenv';

dotenv.config();

export const twitchConfig = {
  clientId: process.env.TWITCH_CLIENT_ID,
  clientSecret: process.env.TWITCH_CLIENT_SECRET,
  redirectUri: process.env.TWITCH_REDIRECT_URI || 'http://localhost:3000/auth/twitch/callback',
  scopes: [
    'chat:read',
    'chat:edit',
    'channel:moderate',
    'bits:read',
    'channel:read:redemptions',
    'user:read:email'
  ],
  authUrl: 'https://id.twitch.tv/oauth2/authorize',
  tokenUrl: 'https://id.twitch.tv/oauth2/token',
  validateUrl: 'https://id.twitch.tv/oauth2/validate',
  apiUrl: 'https://api.twitch.tv/helix'
};

