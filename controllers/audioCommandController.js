import {
  createAudioCommand,
  getAudioCommandsByUserId,
  getAudioCommandById,
  updateAudioCommand,
  deleteAudioCommand
} from '../models/audioCommand.js';
import { getUserByTwitchId } from '../models/user.js';
import { downloadAudioFromUrl, deleteAudioFile } from '../services/fileUpload.js';
import { reloadCommandHandlers } from '../services/twitchChat.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
 * Create a new audio command
 */
export async function createCommand(req, res) {
  try {
    const twitchUserId = req.session.userId;
    if (!twitchUserId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const { command, volume, fileUrl } = req.body;
    const file = req.file;

    if (!command) {
      return res.status(400).json({ error: 'Command is required' });
    }

    // Get user ID
    const userId = await getUserIdFromTwitchId(twitchUserId);
    if (!userId) {
      return res.status(404).json({ error: 'User not found' });
    }

    let filePath = null;
    let fileSize = 0;

    // Handle file upload or URL download
    if (file) {
      // File was uploaded
      filePath = `/uploads/audio/${path.basename(file.path)}`;
      fileSize = file.size;
    } else if (fileUrl) {
      // Download from URL
      try {
        const downloadResult = await downloadAudioFromUrl(fileUrl, userId);
        filePath = downloadResult.filePath;
        fileSize = downloadResult.fileSize;
      } catch (error) {
        return res.status(400).json({ 
          error: 'Failed to download audio from URL',
          message: error.message 
        });
      }
    } else {
      return res.status(400).json({ error: 'Either a file or URL must be provided' });
    }

    // Create audio command
    const audioCommand = await createAudioCommand({
      userId,
      twitchUserId,
      command: command.trim(),
      filePath,
      fileUrl: fileUrl || null,
      fileSize,
      volume: volume ? parseFloat(volume) : 0.5
    });

    // Reload command handlers for this user
    await reloadCommandHandlers(twitchUserId);

    res.status(201).json({
      success: true,
      audioCommand
    });
  } catch (error) {
    console.error('Error creating audio command:', error);
    res.status(500).json({
      error: 'Failed to create audio command',
      message: error.message
    });
  }
}

/**
 * Get all audio commands for the current user
 */
export async function getCommands(req, res) {
  try {
    const twitchUserId = req.session.userId;
    if (!twitchUserId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const userId = await getUserIdFromTwitchId(twitchUserId);
    if (!userId) {
      return res.status(404).json({ error: 'User not found' });
    }

    const commands = await getAudioCommandsByUserId(userId);
    res.json({
      success: true,
      commands
    });
  } catch (error) {
    console.error('Error getting audio commands:', error);
    res.status(500).json({
      error: 'Failed to get audio commands',
      message: error.message
    });
  }
}

/**
 * Get a single audio command
 */
export async function getCommand(req, res) {
  try {
    const twitchUserId = req.session.userId;
    if (!twitchUserId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const userId = await getUserIdFromTwitchId(twitchUserId);
    if (!userId) {
      return res.status(404).json({ error: 'User not found' });
    }

    const commandId = parseInt(req.params.id);
    const command = await getAudioCommandById(commandId, userId);

    if (!command) {
      return res.status(404).json({ error: 'Audio command not found' });
    }

    res.json({
      success: true,
      command
    });
  } catch (error) {
    console.error('Error getting audio command:', error);
    res.status(500).json({
      error: 'Failed to get audio command',
      message: error.message
    });
  }
}

/**
 * Update an audio command
 */
export async function updateCommand(req, res) {
  try {
    const twitchUserId = req.session.userId;
    if (!twitchUserId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const userId = await getUserIdFromTwitchId(twitchUserId);
    if (!userId) {
      return res.status(404).json({ error: 'User not found' });
    }

    const commandId = parseInt(req.params.id);
    const updateData = {};

    // Handle file upload or URL download if provided
    if (req.file) {
      // Get old command to delete old file
      const oldCommand = await getAudioCommandById(commandId, userId);
      if (oldCommand && oldCommand.file_path) {
        deleteAudioFile(oldCommand.file_path);
      }

      updateData.file_path = `/uploads/audio/${path.basename(req.file.path)}`;
      updateData.file_size = req.file.size;
    } else if (req.body.fileUrl) {
      // Download from URL
      try {
        const oldCommand = await getAudioCommandById(commandId, userId);
        if (oldCommand && oldCommand.file_path) {
          deleteAudioFile(oldCommand.file_path);
        }

        const downloadResult = await downloadAudioFromUrl(req.body.fileUrl, userId);
        updateData.file_path = downloadResult.filePath;
        updateData.file_size = downloadResult.fileSize;
        updateData.file_url = req.body.fileUrl;
      } catch (error) {
        return res.status(400).json({
          error: 'Failed to download audio from URL',
          message: error.message
        });
      }
    }

    // Add other update fields
    if (req.body.command) updateData.command = req.body.command;
    if (req.body.volume !== undefined) updateData.volume = parseFloat(req.body.volume);
    if (req.body.is_active !== undefined) updateData.is_active = req.body.is_active === 'true' || req.body.is_active === true;

    const updatedCommand = await updateAudioCommand(commandId, userId, updateData);

    if (!updatedCommand) {
      return res.status(404).json({ error: 'Audio command not found' });
    }

    // Reload command handlers for this user
    await reloadCommandHandlers(twitchUserId);

    res.json({
      success: true,
      audioCommand: updatedCommand
    });
  } catch (error) {
    console.error('Error updating audio command:', error);
    res.status(500).json({
      error: 'Failed to update audio command',
      message: error.message
    });
  }
}

/**
 * Delete an audio command
 */
export async function deleteCommand(req, res) {
  try {
    const twitchUserId = req.session.userId;
    if (!twitchUserId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const userId = await getUserIdFromTwitchId(twitchUserId);
    if (!userId) {
      return res.status(404).json({ error: 'User not found' });
    }

    const commandId = parseInt(req.params.id);
    const command = await getAudioCommandById(commandId, userId);

    if (!command) {
      return res.status(404).json({ error: 'Audio command not found' });
    }

    // Delete the file
    if (command.file_path) {
      deleteAudioFile(command.file_path);
    }

    // Delete from database
    await deleteAudioCommand(commandId, userId);

    // Reload command handlers for this user
    await reloadCommandHandlers(twitchUserId);

    res.json({
      success: true,
      message: 'Audio command deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting audio command:', error);
    res.status(500).json({
      error: 'Failed to delete audio command',
      message: error.message
    });
  }
}

