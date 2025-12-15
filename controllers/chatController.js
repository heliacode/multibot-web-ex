import { connectToChat, disconnectFromChat, getChatStatus, getMessageHistory } from '../services/twitchChat.js';

export async function startChat(req, res) {
  try {
    const twitchUserId = req.session.userId;
    const username = req.session.username;
    const accessToken = req.session.accessToken; // Get from session if available

    if (!twitchUserId || !username) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    // Connect to chat (onMessage callback will be handled by WebSocket)
    await connectToChat(twitchUserId, username, accessToken);
    
    const status = getChatStatus(twitchUserId);
    res.json({ 
      success: true, 
      status,
      message: 'Connected to chat'
    });
  } catch (error) {
    console.error('Error starting chat:', error);
    res.status(500).json({ 
      error: 'Failed to connect to chat',
      message: error.message 
    });
  }
}

export async function stopChat(req, res) {
  try {
    const twitchUserId = req.session.userId;

    if (!twitchUserId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    await disconnectFromChat(twitchUserId);
    
    res.json({ 
      success: true, 
      message: 'Disconnected from chat'
    });
  } catch (error) {
    console.error('Error stopping chat:', error);
    res.status(500).json({ 
      error: 'Failed to disconnect from chat',
      message: error.message 
    });
  }
}

export function getStatus(req, res) {
  try {
    const twitchUserId = req.session.userId;

    if (!twitchUserId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const status = getChatStatus(twitchUserId);
    const history = getMessageHistory(twitchUserId);
    
    res.json({ 
      status,
      history: history.slice(-50) // Return last 50 messages
    });
  } catch (error) {
    console.error('Error getting chat status:', error);
    res.status(500).json({ 
      error: 'Failed to get chat status',
      message: error.message 
    });
  }
}

