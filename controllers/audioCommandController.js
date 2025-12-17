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
    console.log('[AUDIO CMD DEBUG] Session data:', {
      userId: twitchUserId,
      username: req.session.username,
      displayName: req.session.displayName,
      sessionId: req.sessionID
    });
    
    if (!twitchUserId) {
      console.error('[AUDIO CMD DEBUG] No userId in session');
      return res.status(401).json({ error: 'Not authenticated' });
    }

    // Parse form data - multer handles 'audioFile', body parser handles other fields
    console.log('[AUDIO CMD DEBUG] Request received:', {
      method: req.method,
      hasFile: !!req.file,
      bodyKeys: Object.keys(req.body),
      fileField: req.file ? {
        fieldname: req.file.fieldname,
        originalname: req.file.originalname,
        filename: req.file.filename,
        path: req.file.path,
        size: req.file.size
      } : null
    });
    
    const command = req.body.command;
    const volume = req.body.volume;
    const fileUrl = req.body.fileUrl || req.body.url; // Support both field names
    const isBitsOnly = req.body.isBitsOnly;
    const file = req.file; // This will be populated by multer middleware for 'audioFile' field

    console.log('[AUDIO CMD DEBUG] Parsed values:', {
      command,
      volume,
      fileUrl,
      isBitsOnly,
      hasFile: !!file
    });

    if (!command) {
      console.error('[AUDIO CMD DEBUG] Command is missing');
      return res.status(400).json({ error: 'Command is required' });
    }

    // Get user ID - ensure we're using string comparison
    const twitchUserIdStr = String(twitchUserId);
    console.log('[AUDIO CMD DEBUG] Looking up user with twitchUserId:', twitchUserIdStr, 'Type:', typeof twitchUserIdStr);
    const userId = await getUserIdFromTwitchId(twitchUserIdStr);
    console.log('[AUDIO CMD DEBUG] Found userId:', userId);
    
    if (!userId) {
      console.error('[AUDIO CMD DEBUG] User lookup failed. Session userId:', twitchUserIdStr);
      console.error('[AUDIO CMD DEBUG] Checking database for this twitch_user_id...');
      // Let's also check what's actually in the database
      const { getUserByTwitchId } = await import('../models/user.js');
      const dbUser = await getUserByTwitchId(twitchUserIdStr);
      console.error('[AUDIO CMD DEBUG] Direct DB lookup result:', dbUser ? `Found user id ${dbUser.id}` : 'NOT FOUND');
      return res.status(404).json({ error: 'User not found', debug: { sessionUserId: twitchUserIdStr } });
    }

    let filePath = null;
    let fileSize = 0;

    // Handle file upload or URL download
    if (file) {
      // File was uploaded
      console.log('[AUDIO CMD DEBUG] File uploaded:', {
        originalName: file.originalname,
        filename: file.filename,
        path: file.path,
        size: file.size,
        mimetype: file.mimetype
      });
      filePath = `/uploads/audio/${path.basename(file.path)}`;
      fileSize = file.size;
    } else if (fileUrl) {
      // Download from URL
      console.log('[AUDIO CMD DEBUG] Downloading from URL:', fileUrl);
      try {
        const downloadResult = await downloadAudioFromUrl(fileUrl, userId);
        filePath = downloadResult.filePath;
        fileSize = downloadResult.fileSize;
        console.log('[AUDIO CMD DEBUG] Download successful:', { filePath, fileSize });
      } catch (error) {
        console.error('[AUDIO CMD DEBUG] Download failed:', error);
        return res.status(400).json({ 
          error: 'Failed to download audio from URL',
          message: error.message 
        });
      }
    } else {
      // For updates, allow updating without providing a new file/URL
      // For creates, require either file or URL
      if (req.method === 'POST') {
        console.error('[AUDIO CMD DEBUG] No file or URL provided for POST request');
        console.error('[AUDIO CMD DEBUG] Request body:', req.body);
        console.error('[AUDIO CMD DEBUG] Request file:', req.file);
        return res.status(400).json({ error: 'Either a file or URL must be provided' });
      }
      // For PUT requests, continue without file/URL if updating other fields
    }

    // Validate that we have a file path for POST requests
    if (req.method === 'POST' && !filePath) {
      console.error('[AUDIO CMD DEBUG] POST request missing filePath');
      return res.status(400).json({ error: 'File path is required' });
    }

    console.log('[AUDIO CMD DEBUG] Creating audio command with data:', {
      userId,
      twitchUserId,
      command: command.trim(),
      filePath,
      fileUrl: fileUrl || null,
      fileSize,
      volume: volume ? parseFloat(volume) : 0.5,
      isBitsOnly: isBitsOnly === 'true' || isBitsOnly === true
    });

    // Create audio command
    const audioCommand = await createAudioCommand({
      userId,
      twitchUserId,
      command: command.trim(),
      filePath,
      fileUrl: fileUrl || null,
      fileSize,
      volume: volume ? parseFloat(volume) : 0.5,
      isBitsOnly: isBitsOnly === 'true' || isBitsOnly === true
    });

    // Reload command handlers for this user
    await reloadCommandHandlers(twitchUserId);

    res.status(201).json({
      success: true,
      command: audioCommand
    });
  } catch (error) {
    console.error('[AUDIO CMD DEBUG] Error creating audio command:', error);
    console.error('[AUDIO CMD DEBUG] Error stack:', error.stack);
    // Ensure we always return JSON, even on errors
    const errorMessage = error.message || 'Unknown error';
    res.status(500).json({
      error: 'Failed to create audio command',
      message: errorMessage,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
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
      const urlToUse = req.body.fileUrl;
      try {
        const oldCommand = await getAudioCommandById(commandId, userId);
        if (oldCommand && oldCommand.file_path) {
          deleteAudioFile(oldCommand.file_path);
        }

        const downloadResult = await downloadAudioFromUrl(urlToUse, userId);
        updateData.file_path = downloadResult.filePath;
        updateData.file_size = downloadResult.fileSize;
        updateData.file_url = urlToUse;
      } catch (error) {
        return res.status(400).json({
          error: 'Failed to download audio from URL',
          message: error.message
        });
      }
    }
    // If neither file nor URL provided, update only other fields (command, volume, etc.)

    // Add other update fields
    if (req.body.command) updateData.command = req.body.command;
    if (req.body.volume !== undefined) {
      const volumeValue = req.body.volume;
      updateData.volume = typeof volumeValue === 'string' ? parseFloat(volumeValue) : volumeValue;
    }
    if (req.body.is_active !== undefined) updateData.is_active = req.body.is_active === 'true' || req.body.is_active === true;

    const updatedCommand = await updateAudioCommand(commandId, userId, updateData);

    if (!updatedCommand) {
      return res.status(404).json({ error: 'Audio command not found' });
    }

    // Reload command handlers for this user
    await reloadCommandHandlers(twitchUserId);

    res.json({
      success: true,
      command: updatedCommand
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

