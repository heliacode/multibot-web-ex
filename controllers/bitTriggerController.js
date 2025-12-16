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

    const { bitAmount, commandType, commandId } = req.body;

    if (!bitAmount || !commandType || !commandId) {
      return res.status(400).json({ error: 'bitAmount, commandType, and commandId are required' });
    }

    if (!['audio', 'gif'].includes(commandType)) {
      return res.status(400).json({ error: 'commandType must be "audio" or "gif"' });
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
      commandType,
      commandId: parseInt(commandId)
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

    const trigger = await updateBitTrigger(parseInt(id), userId, req.body);

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

