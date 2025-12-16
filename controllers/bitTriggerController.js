import { createBitTrigger, getBitTriggersByUserId, getBitTriggerById, updateBitTrigger, deleteBitTrigger } from '../models/bitTrigger.js';
import { getUserByTwitchId } from '../models/user.js';

/**
 * Create a new bit trigger
 */
export async function createTrigger(req, res) {
  try {
    const twitchUserId = req.session.userId;
    
    if (!twitchUserId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const { bitAmount, commandType, commandId, isDedicated, dedicatedGifUrl, dedicatedGifId, dedicatedGifTitle, dedicatedGifPosition, dedicatedGifSize, dedicatedGifDuration } = req.body;

    if (!bitAmount) {
      return res.status(400).json({ error: 'bitAmount is required' });
    }

    // Validate dedicated trigger
    if (isDedicated) {
      if (!dedicatedGifUrl) {
        return res.status(400).json({ error: 'dedicatedGifUrl is required for dedicated triggers' });
      }
    } else {
      // Validate command-based trigger
      if (!commandType || !commandId) {
        return res.status(400).json({ error: 'commandType and commandId are required for command-based triggers' });
      }
      if (!['audio', 'gif'].includes(commandType)) {
        return res.status(400).json({ error: 'commandType must be "audio" or "gif"' });
      }
    }

    const user = await getUserByTwitchId(twitchUserId);
    const userId = user ? user.id : null;
    
    if (!userId) {
      return res.status(404).json({ error: 'User not found' });
    }

    const bitTrigger = await createBitTrigger({
      userId,
      twitchUserId,
      bitAmount: parseInt(bitAmount),
      commandType: isDedicated ? null : commandType,
      commandId: isDedicated ? null : parseInt(commandId),
      isDedicated: isDedicated || false,
      dedicatedGifUrl: isDedicated ? dedicatedGifUrl : null,
      dedicatedGifId: isDedicated ? (dedicatedGifId || null) : null,
      dedicatedGifTitle: isDedicated ? (dedicatedGifTitle || 'Thank You!') : null,
      dedicatedGifPosition: isDedicated ? (dedicatedGifPosition || 'center') : null,
      dedicatedGifSize: isDedicated ? (dedicatedGifSize || 'medium') : null,
      dedicatedGifDuration: isDedicated ? (parseInt(dedicatedGifDuration) || 5000) : null
    });

    res.status(201).json({
      success: true,
      bitTrigger
    });
  } catch (error) {
    console.error('Error creating bit trigger:', error);
    res.status(500).json({ error: error.message });
  }
}

/**
 * Get all bit triggers for the logged-in user
 */
export async function getTriggers(req, res) {
  try {
    const twitchUserId = req.session.userId;
    
    if (!twitchUserId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const user = await getUserByTwitchId(twitchUserId);
    const userId = user ? user.id : null;
    
    if (!userId) {
      return res.status(404).json({ error: 'User not found' });
    }

    const triggers = await getBitTriggersByUserId(userId);

    res.json({
      success: true,
      triggers
    });
  } catch (error) {
    console.error('Error getting bit triggers:', error);
    res.status(500).json({ error: error.message });
  }
}

/**
 * Get a specific bit trigger
 */
export async function getTrigger(req, res) {
  try {
    const twitchUserId = req.session.userId;
    const { id } = req.params;
    
    if (!twitchUserId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const user = await getUserByTwitchId(twitchUserId);
    const userId = user ? user.id : null;
    
    if (!userId) {
      return res.status(404).json({ error: 'User not found' });
    }

    const trigger = await getBitTriggerById(parseInt(id), userId);

    if (!trigger) {
      return res.status(404).json({ error: 'Bit trigger not found' });
    }

    res.json({
      success: true,
      trigger
    });
  } catch (error) {
    console.error('Error getting bit trigger:', error);
    res.status(500).json({ error: error.message });
  }
}

/**
 * Update a bit trigger
 */
export async function updateTrigger(req, res) {
  try {
    const twitchUserId = req.session.userId;
    const { id } = req.params;
    
    if (!twitchUserId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const user = await getUserByTwitchId(twitchUserId);
    const userId = user ? user.id : null;
    
    if (!userId) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Map camelCase from frontend to snake_case for database
    const { bitAmount, commandType, commandId, isActive, isDedicated, dedicatedGifUrl, dedicatedGifId, dedicatedGifTitle, dedicatedGifPosition, dedicatedGifSize, dedicatedGifDuration } = req.body;
    const updateData = {};
    
    if (bitAmount !== undefined) {
      updateData.bit_amount = parseInt(bitAmount);
    }
    if (isDedicated !== undefined) {
      updateData.is_dedicated = isDedicated;
      // When switching to dedicated, clear command fields
      if (isDedicated) {
        updateData.command_type = null;
        updateData.command_id = null;
      }
      // When switching from dedicated, clear dedicated fields
      if (!isDedicated) {
        updateData.dedicated_gif_url = null;
        updateData.dedicated_gif_id = null;
        updateData.dedicated_gif_title = null;
        updateData.dedicated_gif_position = null;
        updateData.dedicated_gif_size = null;
        updateData.dedicated_gif_duration = null;
      }
    }
    if (commandType !== undefined && !isDedicated) {
      if (!['audio', 'gif'].includes(commandType)) {
        return res.status(400).json({ error: 'commandType must be "audio" or "gif"' });
      }
      updateData.command_type = commandType;
    }
    if (commandId !== undefined && !isDedicated) {
      updateData.command_id = parseInt(commandId);
    }
    if (isActive !== undefined) {
      updateData.is_active = isActive;
    }
    if (dedicatedGifUrl !== undefined && isDedicated) {
      updateData.dedicated_gif_url = dedicatedGifUrl;
    }
    if (dedicatedGifId !== undefined && isDedicated) {
      updateData.dedicated_gif_id = dedicatedGifId;
    }
    if (dedicatedGifTitle !== undefined && isDedicated) {
      updateData.dedicated_gif_title = dedicatedGifTitle;
    }
    if (dedicatedGifPosition !== undefined && isDedicated) {
      updateData.dedicated_gif_position = dedicatedGifPosition;
    }
    if (dedicatedGifSize !== undefined && isDedicated) {
      updateData.dedicated_gif_size = dedicatedGifSize;
    }
    if (dedicatedGifDuration !== undefined && isDedicated) {
      updateData.dedicated_gif_duration = parseInt(dedicatedGifDuration);
    }

    const trigger = await updateBitTrigger(parseInt(id), userId, updateData);

    if (!trigger) {
      return res.status(404).json({ error: 'Bit trigger not found' });
    }

    res.json({
      success: true,
      trigger
    });
  } catch (error) {
    console.error('Error updating bit trigger:', error);
    res.status(500).json({ error: error.message });
  }
}

/**
 * Delete a bit trigger
 */
export async function deleteTrigger(req, res) {
  try {
    const twitchUserId = req.session.userId;
    const { id } = req.params;
    
    if (!twitchUserId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const user = await getUserByTwitchId(twitchUserId);
    const userId = user ? user.id : null;
    
    if (!userId) {
      return res.status(404).json({ error: 'User not found' });
    }

    const trigger = await deleteBitTrigger(parseInt(id), userId);

    if (!trigger) {
      return res.status(404).json({ error: 'Bit trigger not found' });
    }

    res.json({
      success: true,
      message: 'Bit trigger deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting bit trigger:', error);
    res.status(500).json({ error: error.message });
  }
}

