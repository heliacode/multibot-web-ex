import { saveDesignElements, getDesignElementsByTwitchId } from '../models/designElement.js';
import { getUserByTwitchId } from '../models/user.js';

/**
 * Broadcast design update to OBS browser sources via WebSocket
 */
function broadcastDesignUpdate(twitchUserId, designData) {
  // Get WebSocket server from global (set in server.js)
  const wss = global.wss || null;
  
  if (!wss) {
    console.warn('[Design] WebSocket server not available for broadcasting design update');
    return;
  }
  
  let sentCount = 0;
  wss.clients.forEach((client) => {
    // Send to OBS sources for this user
    if (client.isObsSource && 
        client.userId && 
        String(client.userId) === String(twitchUserId) && 
        client.readyState === 1 && 
        client.isAuthenticated) {
      try {
        const designDataStr = typeof designData === 'string' 
          ? designData 
          : JSON.stringify(designData);
        
        client.send(JSON.stringify({
          type: 'design_update',
          designData: designDataStr
        }));
        sentCount++;
        console.log(`[Design] Broadcasted design update to OBS source for user ${twitchUserId}`);
      } catch (error) {
        console.error(`[Design] Error sending design update to OBS source:`, error);
      }
    }
  });
  
  if (sentCount > 0) {
    console.log(`[Design] Broadcasted design update to ${sentCount} OBS source(s) for user ${twitchUserId}`);
  }
}

async function getUserIdFromTwitchId(twitchUserId) {
  try {
    const user = await getUserByTwitchId(twitchUserId);
    return user ? user.id : null;
  } catch (error) {
    return null;
  }
}

/**
 * Save design elements
 */
export async function saveDesign(req, res) {
  try {
    const twitchUserId = req.session.userId;
    
    if (!twitchUserId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const { elements } = req.body;
    
    if (!elements || !Array.isArray(elements)) {
      return res.status(400).json({ error: 'Invalid design data' });
    }

    const userId = await getUserIdFromTwitchId(twitchUserId);
    if (!userId) {
      return res.status(404).json({ error: 'User not found' });
    }

    const design = await saveDesignElements(userId, twitchUserId, elements);

    // Broadcast design update to OBS browser sources
    broadcastDesignUpdate(twitchUserId, design.design_data);

    res.json({
      success: true,
      design
    });
  } catch (error) {
    console.error('Error saving design:', error);
    res.status(500).json({
      error: 'Failed to save design',
      message: error.message
    });
  }
}

/**
 * Get design elements for the current user
 */
export async function getDesign(req, res) {
  try {
    const twitchUserId = req.session.userId;
    
    if (!twitchUserId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const design = await getDesignElementsByTwitchId(twitchUserId);

    res.json({
      success: true,
      design: design || { design_data: [] }
    });
  } catch (error) {
    console.error('Error getting design:', error);
    res.status(500).json({
      error: 'Failed to get design',
      message: error.message
    });
  }
}

