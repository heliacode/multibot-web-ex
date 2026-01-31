import {
  getOrCreateObsToken,
  getObsTokenByUserId,
  regenerateObsToken,
  getObsTokenByToken,
  updateTokenUsage
} from '../models/obsToken.js';
import { getUserByTwitchId } from '../models/user.js';

/**
 * Get or create OBS token for the current user
 */
export async function getToken(req, res) {
  try {
    const twitchUserId = req.session.userId;
    console.log('[OBS TOKEN DEBUG] Session data:', {
      userId: twitchUserId,
      username: req.session.username,
      displayName: req.session.displayName,
      sessionId: req.sessionID
    });
    
    if (!twitchUserId) {
      console.error('[OBS TOKEN DEBUG] No userId in session');
      return res.status(401).json({ error: 'Not authenticated' });
    }

    // Get user ID from database - ensure we're using string comparison
    const twitchUserIdStr = String(twitchUserId);
    console.log('[OBS TOKEN DEBUG] Looking up user with twitchUserId:', twitchUserIdStr, 'Type:', typeof twitchUserIdStr);
    const user = await getUserByTwitchId(twitchUserIdStr);
    console.log('[OBS TOKEN DEBUG] Found user:', user ? `id ${user.id}` : 'NOT FOUND');
    
    if (!user || !user.id) {
      console.error('[OBS TOKEN DEBUG] User not found for twitchUserId:', twitchUserIdStr);
      console.error('[OBS TOKEN DEBUG] Checking database for this twitch_user_id...');
      // Let's also check what's actually in the database
      const dbUser = await getUserByTwitchId(twitchUserIdStr);
      console.error('[OBS TOKEN DEBUG] Direct DB lookup result:', dbUser ? `Found user id ${dbUser.id}` : 'NOT FOUND');
      return res.status(404).json({ 
        error: 'User not found', 
        message: 'Please log out and log back in to create your user account.',
        debug: { sessionUserId: twitchUserIdStr } 
      });
    }

    // Get or create token
    console.log('[OBS TOKEN DEBUG] Getting or creating token for userId:', user.id);
    const tokenData = await getOrCreateObsToken(user.id, twitchUserIdStr);
    console.log('[OBS TOKEN DEBUG] Token retrieved/created:', tokenData ? 'Success' : 'Failed');
    
    // Build OBS browser source URL (default: showFeedback=true)
    // Properly encode token for URL (base64 tokens contain +, /, = which need encoding)
    const protocol = req.protocol;
    const host = req.get('host');
    const encodedToken = encodeURIComponent(tokenData.token);
    const obsUrl = `${protocol}://${host}/obs-source?token=${encodedToken}&showFeedback=true`;

    console.log('[OBS TOKEN DEBUG] Returning token data');
    res.json({
      success: true,
      token: tokenData.token,
      obsUrl: obsUrl,
      createdAt: tokenData.created_at,
      lastUsedAt: tokenData.last_used_at
    });
  } catch (error) {
    console.error('[OBS TOKEN DEBUG] Error getting OBS token:', error);
    console.error('[OBS TOKEN DEBUG] Error stack:', error.stack);
    res.status(500).json({
      error: 'Failed to get OBS token',
      message: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
}

/**
 * Regenerate OBS token for the current user
 */
export async function regenerateToken(req, res) {
  try {
    const twitchUserId = req.session.userId;
    console.log('[OBS TOKEN DEBUG] Regenerate - Session userId:', twitchUserId);
    
    if (!twitchUserId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    // Get user ID from database - ensure we're using string comparison
    const twitchUserIdStr = String(twitchUserId);
    const user = await getUserByTwitchId(twitchUserIdStr);
    console.log('[OBS TOKEN DEBUG] Regenerate - Found user:', user ? `id ${user.id}` : 'NOT FOUND');
    
    if (!user || !user.id) {
      console.error('[OBS TOKEN DEBUG] Regenerate - User not found for twitchUserId:', twitchUserIdStr);
      return res.status(404).json({ 
        error: 'User not found',
        debug: { sessionUserId: twitchUserIdStr }
      });
    }

    // Regenerate token
    console.log('[OBS TOKEN DEBUG] Regenerating token for userId:', user.id);
    const tokenData = await regenerateObsToken(user.id, twitchUserIdStr);
    console.log('[OBS TOKEN DEBUG] Token regenerated:', tokenData ? 'Success' : 'Failed');
    
    // Build new OBS browser source URL (default: showFeedback=true)
    // Properly encode token for URL (base64 tokens contain +, /, = which need encoding)
    const protocol = req.protocol;
    const host = req.get('host');
    const encodedToken = encodeURIComponent(tokenData.token);
    const obsUrl = `${protocol}://${host}/obs-source?token=${encodedToken}&showFeedback=true`;

    res.json({
      success: true,
      token: tokenData.token,
      obsUrl: obsUrl,
      createdAt: tokenData.created_at,
      message: 'Token regenerated successfully. Update your OBS browser source URL.'
    });
  } catch (error) {
    console.error('[OBS TOKEN DEBUG] Error regenerating OBS token:', error);
    console.error('[OBS TOKEN DEBUG] Error stack:', error.stack);
    res.status(500).json({
      error: 'Failed to regenerate OBS token',
      message: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
}

/**
 * Validate token (used by OBS browser source)
 * This endpoint is public (no auth required) - token is the authentication
 */
export async function validateToken(req, res) {
  try {
    const { token } = req.query;
    
    if (!token) {
      return res.status(400).json({ error: 'Token is required' });
    }

    const tokenData = await getObsTokenByToken(token);
    
    if (!tokenData) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    // Update last used timestamp
    await updateTokenUsage(token);

    res.json({
      success: true,
      userId: tokenData.twitch_user_id,
      valid: true
    });
  } catch (error) {
    console.error('Error validating token:', error);
    res.status(500).json({
      error: 'Failed to validate token',
      message: error.message
    });
  }
}

