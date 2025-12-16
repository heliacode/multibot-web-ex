/**
 * Test routes for debugging
 */

import express from 'express';
import { getActiveGifCommandsByTwitchUserId } from '../models/gifCommand.js';
import { processCommand } from '../services/twitchChat.js';
import pool from '../config/database.js';

const router = express.Router();

// Test endpoint to manually trigger a command
router.post('/trigger-command', async (req, res) => {
  try {
    const { twitchUserId, command } = req.body;
    
    if (!twitchUserId || !command) {
      return res.status(400).json({ error: 'twitchUserId and command are required' });
    }
    
    // Get the command from database
    const gifCommands = await getActiveGifCommandsByTwitchUserId(twitchUserId);
    const gifCommand = gifCommands.find(cmd => cmd.command.toLowerCase() === command.toLowerCase().replace('!', ''));
    
    if (!gifCommand) {
      return res.status(404).json({ error: `Command !${command} not found` });
    }
    
    // Get WebSocket server
    if (!global.wss) {
      return res.status(500).json({ error: 'WebSocket server not available' });
    }
    
    // Broadcast command trigger
    let sentCount = 0;
    const commandData = {
      type: 'gif_command',
      command: gifCommand.command,
      gifUrl: gifCommand.gif_url,
      gifId: gifCommand.gif_id,
      duration: gifCommand.duration || 5000,
      position: gifCommand.position || 'center',
      size: gifCommand.size || 'medium',
      id: gifCommand.id
    };
    
    const message = {
      type: 'command_trigger',
      command: commandData
    };
    
    global.wss.clients.forEach((client) => {
      if (client.userId && 
          String(client.userId) === String(twitchUserId) && 
          client.readyState === 1 && 
          client.isAuthenticated) {
        try {
          client.send(JSON.stringify(message));
          sentCount++;
        } catch (error) {
          console.error('Error sending to client:', error);
        }
      }
    });
    
    res.json({
      success: true,
      command: commandData,
      clientsFound: sentCount,
      totalClients: global.wss.clients.size
    });
    
  } catch (error) {
    console.error('Test endpoint error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Test endpoint to manually trigger an audio command
router.post('/trigger-audio-command', async (req, res) => {
  try {
    const { twitchUserId, command } = req.body;
    
    if (!twitchUserId || !command) {
      return res.status(400).json({ error: 'twitchUserId and command are required' });
    }
    
    // Get the command from database
    const { getActiveAudioCommandsByTwitchUserId } = await import('../models/audioCommand.js');
    const audioCommands = await getActiveAudioCommandsByTwitchUserId(twitchUserId);
    const audioCommand = audioCommands.find(cmd => cmd.command.toLowerCase() === command.toLowerCase().replace('!', ''));
    
    if (!audioCommand) {
      return res.status(404).json({ error: `Audio command !${command} not found` });
    }
    
    // Get WebSocket server
    if (!global.wss) {
      return res.status(500).json({ error: 'WebSocket server not available' });
    }
    
    // Broadcast command trigger
    let sentCount = 0;
    const commandData = {
      type: 'audio_command',
      command: audioCommand.command,
      filePath: audioCommand.file_path,
      volume: audioCommand.volume || 0.5,
      id: audioCommand.id
    };
    
    const message = {
      type: 'command_trigger',
      command: commandData
    };
    
    global.wss.clients.forEach((client) => {
      if (client.userId && 
          String(client.userId) === String(twitchUserId) && 
          client.readyState === 1 && 
          client.isAuthenticated) {
        try {
          client.send(JSON.stringify(message));
          sentCount++;
        } catch (error) {
          console.error('Error sending to client:', error);
        }
      }
    });
    
    res.json({
      success: true,
      command: commandData,
      clientsFound: sentCount,
      totalClients: global.wss.clients.size
    });
    
  } catch (error) {
    console.error('Test endpoint error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Test endpoint to check command handlers
router.get('/check-commands/:twitchUserId', async (req, res) => {
  try {
    const { twitchUserId } = req.params;
    
    const { getActiveAudioCommandsByTwitchUserId } = await import('../models/audioCommand.js');
    const audioCommands = await getActiveAudioCommandsByTwitchUserId(twitchUserId);
    const gifCommands = await getActiveGifCommandsByTwitchUserId(twitchUserId);
    
    res.json({
      twitchUserId,
      audioCommands: audioCommands.map(cmd => ({
        command: cmd.command,
        filePath: cmd.file_path,
        volume: cmd.volume,
        isActive: cmd.is_active
      })),
      gifCommands: gifCommands.map(cmd => ({
        command: cmd.command,
        gifUrl: cmd.gif_url,
        duration: cmd.duration,
        position: cmd.position,
        isActive: cmd.is_active
      }))
    });
    
  } catch (error) {
    console.error('Check commands error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Test endpoint to simulate a chat command from the logged-in user
router.post('/simulate-command', async (req, res) => {
  try {
    // Get user from session
    const twitchUserId = req.session.userId;
    const username = req.session.username;
    
    if (!twitchUserId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    
    const { command } = req.body;
    
    if (!command) {
      return res.status(400).json({ error: 'command is required' });
    }
    
    // Ensure command has ! prefix
    const commandMessage = command.startsWith('!') ? command : `!${command}`;
    
    console.log(`[Test] Simulating command "${commandMessage}" for user ${twitchUserId} (${username})`);
    
    // Process the command as if it came from chat
    const result = await processCommand(twitchUserId, commandMessage);
    
    if (result) {
      return res.json({
        success: true,
        message: `Command "${commandMessage}" processed successfully`,
        commandType: result.type,
        commandName: result.command
      });
    } else {
      return res.status(404).json({
        success: false,
        error: `No command handler found for "${commandMessage}"`
      });
    }
    
  } catch (error) {
    console.error('Test endpoint error:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;

