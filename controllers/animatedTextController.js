import {
  createAnimatedTextCommand,
  getAnimatedTextCommandsByUserId,
  getAnimatedTextCommandById,
  updateAnimatedTextCommand,
  deleteAnimatedTextCommand
} from '../models/animatedTextCommand.js';
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
 * Create a new animated text command
 */
export async function createCommand(req, res) {
  try {
    const twitchUserId = req.session.userId;
    
    if (!twitchUserId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const {
      command,
      textContent,
      animationType,
      positionX,
      positionY,
      fontSize,
      duration,
      color1,
      color2,
      fontFamily,
      isBitsOnly
    } = req.body;

    if (!command) {
      return res.status(400).json({ error: 'Command is required' });
    }
    
    // textContent is optional - convert empty string to null for dynamic text
    const finalTextContent = (textContent && textContent.trim() !== '') ? textContent.trim() : null;

    const userId = await getUserIdFromTwitchId(twitchUserId);
    if (!userId) {
      return res.status(404).json({ error: 'User not found' });
    }

    const animatedTextCommand = await createAnimatedTextCommand({
      userId,
      twitchUserId,
      command,
      textContent: finalTextContent,
      animationType: animationType || 'neon',
      positionX: positionX || 960,
      positionY: positionY || 540,
      fontSize: fontSize || 48,
      duration: duration || 5000,
      color1: color1 || '#ff005e',
      color2: color2 || '#00d4ff',
      fontFamily: fontFamily || 'Arial',
      isBitsOnly: isBitsOnly === true || isBitsOnly === 'true'
    });

    // Reload command handlers to include the new animated text command
    await reloadCommandHandlers(twitchUserId);

    res.json({
      success: true,
      command: animatedTextCommand
    });
  } catch (error) {
    console.error('Error creating animated text command:', error);
    res.status(500).json({
      error: 'Failed to create animated text command',
      message: error.message
    });
  }
}

/**
 * Get all animated text commands for the current user
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

    const commands = await getAnimatedTextCommandsByUserId(user.id);

    res.json({
      success: true,
      commands
    });
  } catch (error) {
    console.error('Error getting animated text commands:', error);
    res.status(500).json({
      error: 'Failed to get animated text commands',
      message: error.message
    });
  }
}

/**
 * Get a single animated text command by ID
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

    const command = await getAnimatedTextCommandById(id, user.id);

    if (!command) {
      return res.status(404).json({ error: 'Animated text command not found' });
    }

    res.json({
      success: true,
      command
    });
  } catch (error) {
    console.error('Error getting animated text command:', error);
    res.status(500).json({
      error: 'Failed to get animated text command',
      message: error.message
    });
  }
}

/**
 * Update an animated text command
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

    const updatedCommand = await updateAnimatedTextCommand(id, user.id, updateData);

    if (!updatedCommand) {
      return res.status(404).json({ error: 'Animated text command not found' });
    }

    // Reload command handlers to reflect changes
    await reloadCommandHandlers(twitchUserId);

    res.json({
      success: true,
      command: updatedCommand
    });
  } catch (error) {
    console.error('Error updating animated text command:', error);
    res.status(500).json({
      error: 'Failed to update animated text command',
      message: error.message
    });
  }
}

/**
 * Delete an animated text command
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

    const deletedCommand = await deleteAnimatedTextCommand(id, user.id);

    if (!deletedCommand) {
      return res.status(404).json({ error: 'Animated text command not found' });
    }

    // Reload command handlers to remove the deleted command
    await reloadCommandHandlers(twitchUserId);

    res.json({
      success: true,
      message: 'Animated text command deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting animated text command:', error);
    res.status(500).json({
      error: 'Failed to delete animated text command',
      message: error.message
    });
  }
}
