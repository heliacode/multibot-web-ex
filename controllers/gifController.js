import {
  createGifCommand,
  getGifCommandsByUserId,
  getGifCommandById,
  updateGifCommand,
  deleteGifCommand
} from '../models/gifCommand.js';
import { getUserByTwitchId } from '../models/user.js';
import { reloadCommandHandlers } from '../services/twitchChat.js';

/**
 * Get user ID from Twitch user ID
 */
async function getUserIdFromTwitchId(twitchUserId) {
  try {
    const user = await getUserByTwitchId(twitchUserId);
    return user ? user.id : null;
  } catch (error) {
    return null;
  }
}

/**
 * Create a new GIF command
 */
export async function createCommand(req, res) {
  try {
    const twitchUserId = req.session.userId;
    
    if (!twitchUserId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const { command, gifUrl, gifId, gifTitle, duration, position, size, isBitsOnly } = req.body;

    if (!command || !gifUrl) {
      return res.status(400).json({ error: 'Command and GIF URL are required' });
    }

    const userId = await getUserIdFromTwitchId(twitchUserId);
    if (!userId) {
      return res.status(404).json({ error: 'User not found' });
    }

    const gifCommand = await createGifCommand({
      userId,
      twitchUserId,
      command,
      gifUrl,
      gifId: gifId || null,
      gifTitle: gifTitle || null,
      duration: duration || 5000,
      position: position || 'center',
      size: size || 'medium',
      isBitsOnly: isBitsOnly === true || isBitsOnly === 'true'
    });

    // Reload command handlers to include the new GIF command
    await reloadCommandHandlers(twitchUserId);

    res.json({
      success: true,
      command: gifCommand
    });
  } catch (error) {
    console.error('Error creating GIF command:', error);
    res.status(500).json({
      error: 'Failed to create GIF command',
      message: error.message
    });
  }
}

/**
 * Get all GIF commands for the current user
 */
export async function getCommands(req, res) {
  try {
    const twitchUserId = req.session.userId;
    
    if (!twitchUserId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const user = await getUserByTwitchId(twitchUserId);
    if (!user || !user.id) {
      return res.status(404).json({ error: 'User not found' });
    }

    const commands = await getGifCommandsByUserId(user.id);

    res.json({
      success: true,
      commands
    });
  } catch (error) {
    console.error('Error getting GIF commands:', error);
    res.status(500).json({
      error: 'Failed to get GIF commands',
      message: error.message
    });
  }
}

/**
 * Get a single GIF command by ID
 */
export async function getCommand(req, res) {
  try {
    const twitchUserId = req.session.userId;
    
    if (!twitchUserId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const { id } = req.params;

    const user = await getUserByTwitchId(twitchUserId);
    if (!user || !user.id) {
      return res.status(404).json({ error: 'User not found' });
    }

    const command = await getGifCommandById(id, user.id);

    if (!command) {
      return res.status(404).json({ error: 'GIF command not found' });
    }

    res.json({
      success: true,
      command
    });
  } catch (error) {
    console.error('Error getting GIF command:', error);
    res.status(500).json({
      error: 'Failed to get GIF command',
      message: error.message
    });
  }
}

/**
 * Update a GIF command
 */
export async function updateCommand(req, res) {
  try {
    const twitchUserId = req.session.userId;
    
    if (!twitchUserId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const { id } = req.params;
    const updateData = req.body;

    const user = await getUserByTwitchId(twitchUserId);
    if (!user || !user.id) {
      return res.status(404).json({ error: 'User not found' });
    }

    const updatedCommand = await updateGifCommand(id, user.id, updateData);

    if (!updatedCommand) {
      return res.status(404).json({ error: 'GIF command not found' });
    }

    // Reload command handlers to reflect changes
    await reloadCommandHandlers(twitchUserId);

    res.json({
      success: true,
      command: updatedCommand
    });
  } catch (error) {
    console.error('Error updating GIF command:', error);
    res.status(500).json({
      error: 'Failed to update GIF command',
      message: error.message
    });
  }
}

/**
 * Delete a GIF command
 */
export async function deleteCommand(req, res) {
  try {
    const twitchUserId = req.session.userId;
    
    if (!twitchUserId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const { id } = req.params;

    const user = await getUserByTwitchId(twitchUserId);
    if (!user || !user.id) {
      return res.status(404).json({ error: 'User not found' });
    }

    const deletedCommand = await deleteGifCommand(id, user.id);

    if (!deletedCommand) {
      return res.status(404).json({ error: 'GIF command not found' });
    }

    // Reload command handlers to remove the deleted command
    await reloadCommandHandlers(twitchUserId);

    res.json({
      success: true,
      message: 'GIF command deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting GIF command:', error);
    res.status(500).json({
      error: 'Failed to delete GIF command',
      message: error.message
    });
  }
}

