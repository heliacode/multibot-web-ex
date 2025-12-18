import { generateAuthUrl, handleOAuthCallback, generateState, getUserInfo, revokeToken } from '../services/twitchAuth.js';
import { createUser, getUserByTwitchId } from '../models/user.js';
import { connectToChat, disconnectFromChat } from '../services/twitchChat.js';

export function initiateAuth(req, res) {
  // If user is already authenticated and not forcing re-auth, redirect to dashboard
  if (req.session && req.session.userId && req.query.force !== 'true' && req.query.logged_out !== 'true') {
    console.log('[AUTH] User already authenticated, redirecting to dashboard');
    return res.redirect('/dashboard');
  }
  
  const state = generateState();
  req.session.oauthState = state;
  
  // Check if we should force re-authentication (e.g., after logout)
  // This makes Twitch ask for credentials again instead of auto-approving
  const forcePrompt = req.query.force === 'true' || req.query.logged_out === 'true';
  
  console.log('[AUTH] Initiating OAuth', { forcePrompt, hasSession: !!req.session.userId });
  
  const authUrl = generateAuthUrl(state, forcePrompt);
  res.redirect(authUrl);
}

export async function handleCallback(req, res) {
  try {
    const { code, state, error } = req.query;

    // Check for OAuth errors
    if (error) {
      const userMessage = error === 'access_denied' 
        ? 'You cancelled the authorization. Please try again if you want to connect.'
        : 'Authentication was cancelled or incomplete. Please try again.';
      return res.redirect('/?error=' + encodeURIComponent(userMessage));
    }

    // Verify state parameter
    if (!state || state !== req.session.oauthState) {
      return res.redirect('/?error=' + encodeURIComponent('Security verification failed. Please try again.'));
    }

    // Check for authorization code
    if (!code) {
      return res.redirect('/?error=' + encodeURIComponent('Authorization was cancelled or incomplete. Please try again.'));
    }

    // Handle OAuth callback
    const userData = await handleOAuthCallback(code);
    console.log('[OAUTH CALLBACK] User authenticated', { twitchUserId: userData.twitchUserId, username: userData.username });

    // Regenerate session to prevent session fixation attacks
    req.session.regenerate((err) => {
      if (err) {
        console.error('[OAUTH CALLBACK] Session regeneration error:', err);
        // Fallback to regular session if regeneration fails
        req.session.userId = userData.twitchUserId;
        req.session.username = userData.username;
        req.session.displayName = userData.displayName;
        req.session.profileImageUrl = userData.profileImageUrl;
        req.session.accessToken = userData.accessToken;
        req.session.refreshToken = userData.refreshToken;
        delete req.session.oauthState;
        return res.redirect('/dashboard');
      }

      // Store user in new session
      req.session.userId = userData.twitchUserId;
      req.session.username = userData.username;
      req.session.displayName = userData.displayName;
      req.session.profileImageUrl = userData.profileImageUrl;
      req.session.accessToken = userData.accessToken;
      req.session.refreshToken = userData.refreshToken;

      // Clear OAuth state
      delete req.session.oauthState;

      // Auto-connect to chat immediately after login
      console.log('[OAUTH CALLBACK] Auto-connecting to chat for user', userData.twitchUserId);
      connectToChat(userData.twitchUserId, userData.username, userData.accessToken)
        .then(() => {
          console.log('[OAUTH CALLBACK] Chat connected successfully for user', userData.twitchUserId);
        })
        .catch((error) => {
          console.error('[OAUTH CALLBACK] Failed to auto-connect chat (will retry on dashboard):', error.message);
          // Don't block redirect - chat will retry when dashboard loads
        });

      console.log('[OAUTH CALLBACK] Session created, redirecting to dashboard');
      // Clear any logout flags - user has successfully logged in
      res.redirect('/dashboard?logged_in=true');
    });
  } catch (error) {
    console.error('OAuth callback error:', error);
    console.error('Error stack:', error.stack);
    
    // Map technical errors to user-friendly messages
    let userMessage = 'Authentication failed. Please try again.';
    
    if (error.message.includes('Client Secret is not configured')) {
      userMessage = 'Authentication configuration error. Please contact support.';
    } else if (error.message.includes('Failed to exchange')) {
      userMessage = 'Unable to complete authentication. Please try again.';
    } else if (error.message.includes('Failed to fetch user information')) {
      userMessage = 'Unable to retrieve your Twitch account information. Please try again.';
    } else if (error.message.includes('Database error')) {
      userMessage = 'Unable to save your account information. Please try again.';
    }
    
    res.redirect('/?error=' + encodeURIComponent(userMessage));
  }
}

export async function logout(req, res) {
  console.log('[LOGOUT] Logging out user', { userId: req.session?.userId });
  
  // Disconnect chat connection first before revoking tokens
  if (req.session && req.session.userId) {
    const twitchUserId = req.session.userId;
    console.log('[LOGOUT] Disconnecting chat for user', twitchUserId);
    try {
      await disconnectFromChat(twitchUserId);
      console.log('[LOGOUT] Chat disconnected successfully');
    } catch (error) {
      console.warn('[LOGOUT] Error disconnecting chat (continuing anyway):', error.message);
    }
  }
  
  // Revoke tokens on Twitch's side before destroying session
  // This ensures the user must re-authenticate next time
  if (req.session) {
    const accessToken = req.session.accessToken;
    const refreshToken = req.session.refreshToken;
    
    // Revoke both access and refresh tokens
    if (accessToken) {
      console.log('[LOGOUT] Revoking access token');
      await revokeToken(accessToken).catch(err => {
        console.warn('[LOGOUT] Failed to revoke access token:', err.message);
      });
    }
    
    if (refreshToken) {
      console.log('[LOGOUT] Revoking refresh token');
      await revokeToken(refreshToken).catch(err => {
        console.warn('[LOGOUT] Failed to revoke refresh token:', err.message);
      });
    }
    
    // Clear session data
    const sessionId = req.sessionID;
    req.session.userId = null;
    req.session.username = null;
    req.session.displayName = null;
    req.session.profileImageUrl = null;
    req.session.accessToken = null;
    req.session.refreshToken = null;
    req.session.oauthState = null;
    
    // Clear the session cookie explicitly BEFORE destroying
    res.clearCookie('connect.sid', {
      path: '/',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax'
    });
  }
  
  req.session.destroy((err) => {
    if (err) {
      console.error('[LOGOUT] Session destroy error:', err);
      return res.redirect('/?error=' + encodeURIComponent('Logout failed'));
    }
    
    console.log('[LOGOUT] Session destroyed successfully');
    
    // Redirect with logged_out flag and a timestamp to prevent caching
    const timestamp = Date.now();
    res.redirect(`/?logged_out=true&t=${timestamp}`);
  });
}

/**
 * Create user from session data (helper endpoint for users who logged in before DB was set up)
 */
export async function createUserFromSession(req, res) {
  try {
    const twitchUserId = req.session.userId;
    const accessToken = req.session.accessToken;
    const refreshToken = req.session.refreshToken;

    if (!twitchUserId || !accessToken) {
      return res.status(400).json({ error: 'Session data incomplete. Please log out and log back in.' });
    }

    // Check if user already exists
    const existingUser = await getUserByTwitchId(twitchUserId);
    if (existingUser) {
      return res.json({ 
        success: true, 
        message: 'User already exists in database',
        userId: existingUser.id 
      });
    }

    // Fetch user info from Twitch
    const userInfo = await getUserInfo(accessToken);
    
    // Calculate token expiration (default to 1 hour if not available)
    const tokenExpiresAt = new Date(Date.now() + 3600 * 1000);

    // Create user in database
    const userData = {
      twitchUserId: userInfo.id,
      twitchUsername: userInfo.login,
      twitchDisplayName: userInfo.display_name,
      twitchEmail: userInfo.email,
      profileImageUrl: userInfo.profile_image_url,
      accessToken: accessToken,
      refreshToken: refreshToken || '',
      tokenExpiresAt: tokenExpiresAt,
      scopes: [] // We don't have scopes in session, but that's okay
    };

    const user = await createUser(userData);

    res.json({
      success: true,
      message: 'User created successfully',
      userId: user.id
    });
  } catch (error) {
    console.error('Error creating user from session:', error);
    res.status(500).json({
      error: 'Failed to create user from session',
      message: error.message
    });
  }
}

