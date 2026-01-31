import { connectToChat, disconnectFromChat, getChatStatus, getMessageHistory } from '../services/twitchChat.js';

export async function startChat(req, res) {
  try {
    const twitchUserId = req.session.userId;
    const username = req.session.username;
    const accessToken = req.session.accessToken; // Get from session if available

    console.log('[CHAT DEBUG] Session data:', {
      userId: twitchUserId,
      username: username,
      hasAccessToken: !!accessToken,
      sessionId: req.sessionID
    });

    if (!twitchUserId || !username) {
      console.error('[CHAT DEBUG] Missing session data:', {
        hasUserId: !!twitchUserId,
        hasUsername: !!username
      });
      return res.status(401).json({ 
        error: 'Not authenticated',
        message: 'Please log out and log back in to refresh your session.',
        debug: {
          hasUserId: !!twitchUserId,
          hasUsername: !!username
        }
      });
    }

    // Ensure twitchUserId is a string
    const twitchUserIdStr = String(twitchUserId);
    console.log('[CHAT DEBUG] Connecting to chat for userId:', twitchUserIdStr);

    // Connect to chat (onMessage callback will be handled by WebSocket)
    await connectToChat(twitchUserIdStr, username, accessToken);
    
    const status = getChatStatus(twitchUserIdStr);
    console.log('[CHAT DEBUG] Chat connection successful');
    res.json({ 
      success: true, 
      status,
      message: 'Connected to chat'
    });
  } catch (error) {
    console.error('[CHAT DEBUG] Error starting chat:', error);
    console.error('[CHAT DEBUG] Error stack:', error.stack);
    res.status(500).json({ 
      error: 'Failed to connect to chat',
      message: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
}

export async function stopChat(req, res) {
  try {
    const twitchUserId = req.session.userId;

    console.log('[CHAT DEBUG] Stop chat - Session userId:', twitchUserId);

    if (!twitchUserId) {
      return res.status(401).json({ 
        error: 'Not authenticated',
        debug: { hasUserId: false }
      });
    }

    const twitchUserIdStr = String(twitchUserId);
    await disconnectFromChat(twitchUserIdStr);
    
    console.log('[CHAT DEBUG] Chat disconnected successfully');
    res.json({ 
      success: true, 
      message: 'Disconnected from chat'
    });
  } catch (error) {
    console.error('[CHAT DEBUG] Error stopping chat:', error);
    res.status(500).json({ 
      error: 'Failed to disconnect from chat',
      message: error.message 
    });
  }
}

export function getStatus(req, res) {
  try {
    const twitchUserId = req.session.userId;

    console.log('[CHAT DEBUG] Get status - Session userId:', twitchUserId);

    if (!twitchUserId) {
      return res.status(401).json({ 
        error: 'Not authenticated',
        debug: { hasUserId: false }
      });
    }

    const twitchUserIdStr = String(twitchUserId);
    const status = getChatStatus(twitchUserIdStr);
    const history = getMessageHistory(twitchUserIdStr);
    
    res.json({ 
      status,
      history: history.slice(-50) // Return last 50 messages
    });
  } catch (error) {
    console.error('[CHAT DEBUG] Error getting chat status:', error);
    res.status(500).json({ 
      error: 'Failed to get chat status',
      message: error.message 
    });
  }
}

