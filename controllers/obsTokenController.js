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
    if (!twitchUserId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    // Get user ID from database
    const user = await getUserByTwitchId(twitchUserId);
    if (!user || !user.id) {
      console.warn(`[OBS TOKEN] User not found for twitchUserId: ${twitchUserId}`);
      return res.status(404).json({ error: 'User not found', message: 'Please log out and log back in to create your user account.' });
    }

    // Get or create token
    const tokenData = await getOrCreateObsToken(user.id, twitchUserId);
    
    // Build OBS browser source URL (default: showFeedback=true)
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
      lastUsedAt: tokenData.last_used_at
    });
  } catch (error) {
    console.error('Error getting OBS token:', error);
    res.status(500).json({
      error: 'Failed to get OBS token',
      message: error.message
    });
  }
}

/**
 * Regenerate OBS token for the current user
 */
export async function regenerateToken(req, res) {
  try {
    const twitchUserId = req.session.userId;
    if (!twitchUserId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    // Get user ID from database
    const user = await getUserByTwitchId(twitchUserId);
    if (!user || !user.id) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Regenerate token
    const tokenData = await regenerateObsToken(user.id, twitchUserId);
    
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
    console.error('Error regenerating OBS token:', error);
    res.status(500).json({
      error: 'Failed to regenerate OBS token',
      message: error.message
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

