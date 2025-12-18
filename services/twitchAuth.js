import axios from 'axios';
import crypto from 'crypto';
import { twitchConfig } from '../config/twitch.js';
import { createUser, getUserByTwitchId, updateUserTokens } from '../models/user.js';

export function generateAuthUrl(state, forcePrompt = false) {
  const params = new URLSearchParams({
    client_id: twitchConfig.clientId,
    redirect_uri: twitchConfig.redirectUri,
    response_type: 'code',
    scope: twitchConfig.scopes.join(' '),
    state: state
  });

  // Add force_verify parameter to force re-authentication if requested
  // Twitch uses force_verify=true (not prompt=consent) to force re-authentication
  // This ensures Twitch asks for credentials and re-authorization
  if (forcePrompt) {
    params.append('force_verify', 'true');
  }

  return `${twitchConfig.authUrl}?${params.toString()}`;
}

export async function exchangeCodeForTokens(code) {
  // Validate configuration
  if (!twitchConfig.clientSecret || twitchConfig.clientSecret === 'your_client_secret_here') {
    throw new Error('Twitch Client Secret is not configured. Please set TWITCH_CLIENT_SECRET in your .env file.');
  }

  try {
    const response = await axios.post(
      twitchConfig.tokenUrl,
      new URLSearchParams({
        client_id: twitchConfig.clientId,
        client_secret: twitchConfig.clientSecret,
        code: code,
        grant_type: 'authorization_code',
        redirect_uri: twitchConfig.redirectUri
      }),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    );

    // Handle scope - it might be a string or already an array
    let scopes = [];
    if (response.data.scope) {
      if (Array.isArray(response.data.scope)) {
        scopes = response.data.scope;
      } else if (typeof response.data.scope === 'string') {
        scopes = response.data.scope.split(' ');
      }
    }

    return {
      accessToken: response.data.access_token,
      refreshToken: response.data.refresh_token,
      expiresIn: response.data.expires_in,
      scopes: scopes
    };
  } catch (error) {
    console.error('Error exchanging code for tokens:', error.response?.data || error.message);
    console.error('Full error:', error);
    const errorDetails = error.response?.data 
      ? JSON.stringify(error.response.data) 
      : error.message;
    throw new Error(`Failed to exchange authorization code for tokens: ${errorDetails}`);
  }
}

export async function validateToken(accessToken) {
  try {
    const response = await axios.get(twitchConfig.validateUrl, {
      headers: {
        'Authorization': `OAuth ${accessToken}`
      }
    });

    return response.data;
  } catch (error) {
    console.error('Error validating token:', error.response?.data || error.message);
    return null;
  }
}

export async function getUserInfo(accessToken) {
  try {
    const response = await axios.get(`${twitchConfig.apiUrl}/users`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Client-Id': twitchConfig.clientId
      }
    });

    return response.data.data[0];
  } catch (error) {
    console.error('Error fetching user info:', error.response?.data || error.message);
    console.error('Full error:', error);
    const errorDetails = error.response?.data 
      ? JSON.stringify(error.response.data) 
      : error.message;
    throw new Error(`Failed to fetch user information: ${errorDetails}`);
  }
}

export async function refreshAccessToken(refreshToken) {
  try {
    const response = await axios.post(
      twitchConfig.tokenUrl,
      new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
        client_id: twitchConfig.clientId,
        client_secret: twitchConfig.clientSecret
      }),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    );

    return {
      accessToken: response.data.access_token,
      refreshToken: response.data.refresh_token || refreshToken,
      expiresIn: response.data.expires_in
    };
  } catch (error) {
    console.error('Error refreshing token:', error.response?.data || error.message);
    throw new Error('Failed to refresh access token');
  }
}

export async function handleOAuthCallback(code) {
  // Exchange code for tokens
  const tokens = await exchangeCodeForTokens(code);

  // Get user information
  const userInfo = await getUserInfo(tokens.accessToken);

  // Calculate token expiration time
  const tokenExpiresAt = new Date(Date.now() + tokens.expiresIn * 1000);

  // Save or update user in database (optional - continue even if database fails)
  const userData = {
    twitchUserId: userInfo.id,
    twitchUsername: userInfo.login,
    twitchDisplayName: userInfo.display_name,
    twitchEmail: userInfo.email,
    profileImageUrl: userInfo.profile_image_url,
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
    tokenExpiresAt: tokenExpiresAt,
    scopes: tokens.scopes
  };

  try {
    await createUser(userData);
  } catch (dbError) {
    console.warn('Database save failed (continuing anyway):', dbError.message);
    // Continue even if database save fails - user can still authenticate
  }

  return {
    twitchUserId: userInfo.id,
    username: userInfo.login,
    displayName: userInfo.display_name,
    email: userInfo.email,
    profileImageUrl: userInfo.profile_image_url,
    accessToken: tokens.accessToken, // Include access token for session storage
    refreshToken: tokens.refreshToken
  };
}

export function generateState() {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Revoke an access token or refresh token
 * This invalidates the token on Twitch's side, forcing re-authentication
 */
export async function revokeToken(token) {
  try {
    await axios.post(
      twitchConfig.revokeUrl,
      new URLSearchParams({
        client_id: twitchConfig.clientId,
        token: token
      }),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    );
    console.log('[TOKEN REVOCATION] Token revoked successfully');
    return true;
  } catch (error) {
    // Log but don't throw - token might already be revoked or invalid
    console.warn('[TOKEN REVOCATION] Error revoking token (may already be invalid):', error.response?.data || error.message);
    return false;
  }
}

