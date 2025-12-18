import tmi from 'tmi.js';
import { getUserByTwitchId } from '../models/user.js';
import { twitchConfig } from '../config/twitch.js';
import { getActiveAudioCommandsByTwitchUserId } from '../models/audioCommand.js';
import { getActiveGifCommandsByTwitchUserId } from '../models/gifCommand.js';
import { getActiveAnimatedTextCommandsByTwitchUserId } from '../models/animatedTextCommand.js';
import { findBitTriggerForAmount } from '../models/bitTrigger.js';

// Store active chat connections per user
const activeConnections = new Map();

// Store keep-alive intervals per user
const keepAliveIntervals = new Map();

// Store command handlers per user
const commandHandlers = new Map();

// WebSocket server reference (set by server.js)
let wss = null;

export function setWebSocketServer(server) {
  wss = server;
}

function broadcastMessage(twitchUserId, message) {
  if (!wss) return;
  
  wss.clients.forEach((client) => {
    // Match by userId (stored as string from WebSocket message)
    if (client.userId && String(client.userId) === String(twitchUserId) && client.readyState === 1) {
      client.send(JSON.stringify({
        type: 'chat_message',
        message: message
      }));
    }
  });
}

/**
 * Get or create a Twitch chat client for a user
 */
export async function getChatClient(twitchUserId, username, accessToken = null) {
  // Check if connection already exists
  if (activeConnections.has(twitchUserId)) {
    const existingConnection = activeConnections.get(twitchUserId);
    
    // If a new token is provided and it's different, disconnect and recreate
    // This handles the case where tokens were revoked and user logged back in
    if (accessToken && existingConnection.client) {
      const existingToken = existingConnection.token;
      if (existingToken && existingToken !== accessToken) {
        console.log(`[TwitchChat] Token changed for user ${twitchUserId}, disconnecting old connection`);
        try {
          await existingConnection.client.disconnect();
        } catch (error) {
          console.warn('[TwitchChat] Error disconnecting old connection:', error.message);
        }
        activeConnections.delete(twitchUserId);
        
        // Clear keep-alive interval
        if (keepAliveIntervals.has(twitchUserId)) {
          clearInterval(keepAliveIntervals.get(twitchUserId));
          keepAliveIntervals.delete(twitchUserId);
        }
      } else {
        // Same token, return existing connection
        return existingConnection;
      }
    } else {
      // No new token provided, return existing connection
      return existingConnection;
    }
  }

  let token = accessToken;

  // If no token provided, try to get from database
  if (!token) {
    try {
      const user = await getUserByTwitchId(twitchUserId);
      if (user && user.access_token) {
        token = user.access_token;
      }
    } catch (error) {
      console.warn('Could not get token from database, will try session:', error.message);
    }
  }

  if (!token) {
    throw new Error('Access token is required to connect to Twitch chat. Please reconnect your Twitch account.');
  }

  // Create Twitch chat client with robust reconnection settings
  const client = new tmi.Client({
    options: { 
      debug: false,
      messagesLogLevel: 'info'
    },
    connection: {
      reconnect: true,
      secure: true,
      maxReconnectAttempts: Infinity, // Keep trying to reconnect indefinitely
      reconnectInterval: 1000, // Start with 1 second
      maxReconnectInterval: 30000 // Max 30 seconds between attempts
    },
    identity: {
      username: username.toLowerCase(),
      password: `oauth:${token}`
    },
    channels: [username.toLowerCase()]
  });

  // Store connection with enhanced tracking
  activeConnections.set(twitchUserId, {
    client,
    channel: username.toLowerCase(),
    connected: false,
    token: token, // Store token for comparison
    messageHistory: [],
    lastPingTime: Date.now(),
    lastMessageTime: Date.now(), // Track last message received to detect stale connections
    reconnectAttempts: 0,
    recreationAttempts: 0, // Track connection recreation attempts
    lastRecreationAttempt: 0, // Timestamp of last recreation attempt
    connectionStartTime: Date.now(),
    consecutiveFailures: 0 // Track consecutive keep-alive failures
  });

  return activeConnections.get(twitchUserId);
}

/**
 * Load and set up command handlers for a user
 */
async function setupCommandHandlers(twitchUserId) {
  try {
    const audioCommands = await getActiveAudioCommandsByTwitchUserId(twitchUserId);
    const gifCommands = await getActiveGifCommandsByTwitchUserId(twitchUserId);
    const animatedTextCommands = await getActiveAnimatedTextCommandsByTwitchUserId(twitchUserId);
    console.log(`[TwitchChat] Loading command handlers for user ${twitchUserId}`);
    console.log(`[TwitchChat] Found ${audioCommands.length} audio commands`);
    console.log(`[TwitchChat] Found ${gifCommands.length} GIF commands`);
    console.log(`[TwitchChat] Found ${animatedTextCommands.length} animated text commands`);
    
    const handlers = new Map();
    
    // Add audio commands
    audioCommands.forEach(cmd => {
      handlers.set(cmd.command.toLowerCase(), {
        type: 'audio',
        command: cmd.command,
        filePath: cmd.file_path,
        volume: cmd.volume,
        id: cmd.id
      });
      console.log(`[TwitchChat] Loaded audio command: !${cmd.command}`);
    });
    
    // Add GIF commands
    gifCommands.forEach(cmd => {
      handlers.set(cmd.command.toLowerCase(), {
        type: 'gif',
        command: cmd.command,
        gifUrl: cmd.gif_url,
        gifId: cmd.gif_id,
        duration: cmd.duration || 5000,
        position: cmd.position || 'center',
        size: cmd.size || 'medium',
        id: cmd.id
      });
      console.log(`[TwitchChat] Loaded GIF command: !${cmd.command} -> ${cmd.gif_url} (position: ${cmd.position || 'center'}, size: ${cmd.size || 'medium'})`);
    });
    
    // Add animated text commands
    animatedTextCommands.forEach(cmd => {
      handlers.set(cmd.command.toLowerCase(), {
        type: 'animated_text',
        command: cmd.command,
        textContent: cmd.text_content || null, // Can be null for dynamic text
        animationType: cmd.animation_type || 'neon',
        positionX: cmd.position_x || 960,
        positionY: cmd.position_y || 540,
        fontSize: cmd.font_size || 48,
        duration: cmd.duration || 5000,
        color1: cmd.color1 || '#ff005e',
        color2: cmd.color2 || '#00d4ff',
        fontFamily: cmd.font_family || 'Arial',
        id: cmd.id
      });
      const textInfo = cmd.text_content ? `"${cmd.text_content}"` : 'dynamic from chat';
      console.log(`[TwitchChat] Loaded animated text command: !${cmd.command} -> ${textInfo} (type: ${cmd.animation_type || 'neon'})`);
    });
    
    commandHandlers.set(twitchUserId, handlers);
    console.log(`[TwitchChat] Total handlers loaded: ${handlers.size}`);
    return handlers;
  } catch (error) {
    console.error(`Error loading command handlers for user ${twitchUserId}:`, error);
    return new Map();
  }
}

/**
 * Check if a message matches any command and trigger appropriate handler
 */
export async function processCommand(twitchUserId, message) {
  console.log(`[TwitchChat] processCommand called for user ${twitchUserId}, message: "${message}"`);
  const handlers = commandHandlers.get(twitchUserId) || await setupCommandHandlers(twitchUserId);
  
  // Extract command from message (commands start with !)
  const words = message.trim().split(/\s+/);
  if (words.length === 0 || !words[0].startsWith('!')) {
    console.log(`[TwitchChat] Message doesn't start with !, ignoring`);
    return null;
  }
  
  // Remove the ! prefix for lookup (commands are stored without ! in database)
  const command = words[0].toLowerCase().replace(/^!/, '');
  console.log(`[TwitchChat] Looking for command: "${command}" (from message: "${words[0]}")`);
  console.log(`[TwitchChat] Available commands:`, Array.from(handlers.keys()));
  
  const handler = handlers.get(command);
  
  if (!handler) {
    console.log(`[TwitchChat] No handler found for command: "${command}"`);
    return null;
  }
  
  console.log(`[TwitchChat] Handler found:`, handler);
  
  // Trigger the command handler
  if (handler.type === 'audio') {
    // Broadcast audio command trigger to WebSocket clients
    broadcastCommandTrigger(twitchUserId, {
      type: 'audio_command',
      command: handler.command,
      filePath: handler.filePath,
      volume: handler.volume,
      id: handler.id
    });
  } else if (handler.type === 'gif') {
    // Broadcast GIF command trigger to WebSocket clients
    console.log(`[TwitchChat] Broadcasting GIF command: ${handler.command}`, {
      gifUrl: handler.gifUrl,
      duration: handler.duration,
      position: handler.position,
      size: handler.size
    });
    
    // Ensure position and size are valid strings, not null/undefined/empty
    const position = (handler.position && String(handler.position).trim() !== '') 
      ? String(handler.position).trim() 
      : 'center';
    const size = (handler.size && String(handler.size).trim() !== '') 
      ? String(handler.size).trim() 
      : 'medium';
    
    const commandData = {
      type: 'gif_command',
      command: handler.command,
      gifUrl: handler.gifUrl,
      gifId: handler.gifId,
      duration: handler.duration,
      position: position,
      size: size,
      id: handler.id
    };
    
    console.log(`[TwitchChat] GIF command data - position: "${commandData.position}", size: "${commandData.size}"`);
    broadcastCommandTrigger(twitchUserId, commandData);
  } else if (handler.type === 'animated_text') {
    // Extract text from message after the command
    // If message is "!neon Hello World", extract "Hello World"
    let textContent = handler.textContent || '';
    
    // If no default text, extract from chat message
    if (!textContent || textContent.trim() === '') {
      // Remove the command from the message and get the rest
      const messageParts = message.trim().split(/\s+/);
      if (messageParts.length > 1) {
        // Join all parts after the command
        textContent = messageParts.slice(1).join(' ');
      }
      
      // If still empty, use a default
      if (!textContent || textContent.trim() === '') {
        textContent = handler.command; // Fallback to command name
      }
    }
    
    console.log(`[TwitchChat] Broadcasting animated text command: ${handler.command}`, {
      textContent: textContent,
      animationType: handler.animationType,
      positionX: handler.positionX,
      positionY: handler.positionY
    });
    
    const commandData = {
      type: 'animated_text_command',
      command: handler.command,
      textContent: textContent,
      animationType: handler.animationType,
      positionX: handler.positionX,
      positionY: handler.positionY,
      fontSize: handler.fontSize,
      duration: handler.duration,
      color1: handler.color1,
      color2: handler.color2,
      fontFamily: handler.fontFamily,
      id: handler.id
    };
    
    broadcastCommandTrigger(twitchUserId, commandData);
  }
  
  return handler;
}

/**
 * Broadcast command trigger to WebSocket clients
 */
function broadcastCommandTrigger(twitchUserId, commandData) {
  // Use global.wss if available, fallback to module-level wss
  const wssInstance = global.wss || wss;
  
  if (!wssInstance) {
    console.warn('[Chat] WebSocket server not available for broadcasting');
    return;
  }
  
  let sentCount = 0;
  console.log(`[Chat] Broadcasting command trigger to clients for user ${twitchUserId}`);
  console.log(`[Chat] Command data:`, JSON.stringify(commandData, null, 2));
  if (commandData.type === 'gif_command') {
    console.log(`[Chat] GIF command details - position: "${commandData.position}", size: "${commandData.size}"`);
  }
  console.log(`[Chat] Total WebSocket clients:`, wssInstance.clients.size);
  
  wssInstance.clients.forEach((client) => {
    console.log(`[Chat] Checking client:`, {
      userId: client.userId,
      isObsSource: client.isObsSource,
      isAuthenticated: client.isAuthenticated,
      readyState: client.readyState
    });
    
    // Send to both OBS sources and dashboard clients for this user
    if (client.userId && 
        String(client.userId) === String(twitchUserId) && 
        client.readyState === 1 && 
        client.isAuthenticated) {
      try {
        const message = {
          type: 'command_trigger',
          command: commandData
        };
        if (commandData.type === 'gif_command') {
          console.log(`[Chat] Sending GIF command - position: "${commandData.position}", size: "${commandData.size}"`);
        }
        console.log(`[Chat] Sending message to client:`, JSON.stringify(message, null, 2));
        client.send(JSON.stringify(message));
        sentCount++;
        if (client.isObsSource) {
          console.log(`[Chat] ✓ Broadcasted command trigger to OBS source for user ${twitchUserId}`);
        } else {
          console.log(`[Chat] ✓ Broadcasted command trigger to dashboard client for user ${twitchUserId}`);
        }
      } catch (error) {
        console.error(`[Chat] Error sending command trigger to client:`, error);
      }
    } else {
      console.log(`[Chat] Client skipped:`, {
        hasUserId: !!client.userId,
        userIdMatch: client.userId ? String(client.userId) === String(twitchUserId) : false,
        readyState: client.readyState,
        isAuthenticated: client.isAuthenticated
      });
    }
  });
  
  if (sentCount === 0) {
    console.warn(`[Chat] No WebSocket clients found for user ${twitchUserId} to broadcast command trigger`);
  } else {
    console.log(`[Chat] Broadcasted command trigger to ${sentCount} client(s) for user ${twitchUserId}`);
  }
}

/**
 * Set up keep-alive ping for a connection
 * Twitch IRC requires PING/PONG to keep connection alive
 * We monitor connection health and ensure it stays active
 */
function setupKeepAlive(twitchUserId, connection) {
  // Clear existing interval if any
  if (keepAliveIntervals.has(twitchUserId)) {
    clearInterval(keepAliveIntervals.get(twitchUserId));
  }
  
  // STRONG keep-alive: Check every 30 seconds for aggressive health monitoring
  const interval = setInterval(() => {
    if (!connection.client) {
      clearInterval(interval);
      keepAliveIntervals.delete(twitchUserId);
      return;
    }

    try {
      const now = Date.now();
      connection.lastPingTime = now;
      
      // Check connection state
      const readyState = connection.client.readyState();
      const isConnected = readyState === 'OPEN';
      
      if (!isConnected && connection.connected) {
        // Connection was marked as connected but state shows otherwise
        connection.connected = false;
        connection.consecutiveFailures = (connection.consecutiveFailures || 0) + 1;
        connection.reconnectAttempts = (connection.reconnectAttempts || 0) + 1;
        
        console.warn(`[Keep-Alive] Connection state mismatch for ${twitchUserId}, state: ${readyState}, consecutive failures: ${connection.consecutiveFailures}`);
        console.log(`[Keep-Alive] Reconnection attempt #${connection.reconnectAttempts} for ${twitchUserId}`);
        
        try {
          connection.client.reconnect();
        } catch (reconnectError) {
          console.error(`[Keep-Alive] Reconnect() failed for ${twitchUserId}:`, reconnectError.message);
          
          // If reconnect fails, try to recreate the connection with exponential backoff
          const now = Date.now();
          const timeSinceLastRecreation = now - (connection.lastRecreationAttempt || 0);
          const backoffDelay = Math.min(5000 * Math.pow(2, connection.recreationAttempts || 0), 60000); // Max 60 seconds
          
          if (timeSinceLastRecreation >= backoffDelay) {
            connection.recreationAttempts = (connection.recreationAttempts || 0) + 1;
            connection.lastRecreationAttempt = now;
            
            console.log(`[Keep-Alive] Scheduling connection recreation for ${twitchUserId} (attempt #${connection.recreationAttempts}, delay: ${backoffDelay}ms)`);
            
            setTimeout(async () => {
              try {
                const user = await getUserByTwitchId(twitchUserId);
                if (user && user.access_token) {
                  console.log(`[Keep-Alive] Attempting to recreate connection for ${twitchUserId}`);
                  // Remove old connection before recreating
                  if (activeConnections.has(twitchUserId)) {
                    const oldConnection = activeConnections.get(twitchUserId);
                    try {
                      if (oldConnection.client) {
                        oldConnection.client.removeAllListeners();
                        oldConnection.client.disconnect();
                      }
                    } catch (disconnectError) {
                      // Ignore disconnect errors
                    }
                    activeConnections.delete(twitchUserId);
                  }
                  
                  // Recreate connection
                  await connectToChat(twitchUserId, user.twitch_username || twitchUserId, user.access_token);
                  console.log(`[Keep-Alive] ✓ Connection recreated successfully for ${twitchUserId}`);
                  connection.consecutiveFailures = 0; // Reset on successful recreation
                } else {
                  console.error(`[Keep-Alive] Cannot recreate connection for ${twitchUserId}: User or access token not found`);
                }
              } catch (error) {
                console.error(`[Keep-Alive] Failed to recreate connection for ${twitchUserId}:`, error.message);
                // Keep-alive will try again on next check (30 seconds)
              }
            }, backoffDelay);
          } else {
            console.log(`[Keep-Alive] Skipping recreation for ${twitchUserId} (backoff: ${Math.round((backoffDelay - timeSinceLastRecreation) / 1000)}s remaining)`);
          }
        }
      } else if (isConnected && connection.connected) {
        // Connection is healthy - reset failure counter
        if (connection.consecutiveFailures > 0) {
          console.log(`[Keep-Alive] ✓ Connection recovered for ${twitchUserId} after ${connection.consecutiveFailures} failures`);
          connection.consecutiveFailures = 0;
        }
      }
      
      // Check if we've received messages recently (within last 5 minutes)
      // If not, the connection might be stale even if state says OPEN
      const timeSinceLastMessage = now - connection.lastMessageTime;
      const timeSinceConnection = now - connection.connectionStartTime;
      
      if (isConnected && timeSinceLastMessage > 5 * 60 * 1000 && timeSinceConnection > 5 * 60 * 1000) {
        // No messages in 5 minutes and connection has been up for at least 5 minutes
        // This might indicate a stale connection - verify by checking state
        console.warn(`[Keep-Alive] No messages received in ${Math.round(timeSinceLastMessage / 1000)}s for ${twitchUserId}, connection might be stale`);
        // Force a state check by attempting to get readyState again
        try {
          const currentState = connection.client.readyState();
          if (currentState !== 'OPEN') {
            console.warn(`[Keep-Alive] State check revealed connection is not OPEN (${currentState}), reconnecting...`);
            connection.connected = false;
            connection.client.reconnect();
          }
        } catch (stateError) {
          console.error(`[Keep-Alive] Error checking state for ${twitchUserId}:`, stateError);
          connection.connected = false;
          connection.client.reconnect();
        }
      }
      
      // Log connection health every 2 minutes (less verbose)
      if (isConnected && (now - connection.connectionStartTime) % (2 * 60 * 1000) < 30000) {
        const uptime = Math.round((now - connection.connectionStartTime) / 1000);
        const messagesSinceStart = connection.messageHistory.length;
        const lastMessageAgo = Math.round((now - connection.lastMessageTime) / 1000);
        console.log(`[Keep-Alive] ✓ Connection healthy for ${twitchUserId} - Uptime: ${uptime}s, Messages: ${messagesSinceStart}, Last message: ${lastMessageAgo}s ago`);
      }
      
    } catch (error) {
      console.error(`[Keep-Alive] Error checking connection health for ${twitchUserId}:`, error.message);
      connection.consecutiveFailures = (connection.consecutiveFailures || 0) + 1;
      
      // If error checking state, try to reconnect immediately
      if (connection.connected) {
        connection.connected = false;
        try {
          connection.client.reconnect();
        } catch (reconnectError) {
          console.error(`[Keep-Alive] Reconnect failed for ${twitchUserId}:`, reconnectError.message);
          // Will trigger recreation logic on next check if reconnect keeps failing
        }
      }
      
      // If we've had many consecutive failures, log a warning
      if (connection.consecutiveFailures >= 5) {
        console.warn(`[Keep-Alive] ⚠️  ${connection.consecutiveFailures} consecutive failures for ${twitchUserId} - connection may be unstable`);
      }
    }
  }, 30 * 1000); // Check every 30 seconds for STRONG keep-alive
  
  keepAliveIntervals.set(twitchUserId, interval);
  console.log(`[Keep-Alive] ✓ STRONG keep-alive monitoring started for ${twitchUserId} (checking every 30s)`);
}

/**
 * Process bits donation and trigger appropriate command
 */
export async function processBitsDonation(twitchUserId, bits, username) {
  console.log(`[TwitchChat] Processing bits donation: ${bits} bits from ${username} for user ${twitchUserId}`);
  
  try {
    const bitTrigger = await findBitTriggerForAmount(twitchUserId, bits);
    
    if (!bitTrigger) {
      console.log(`[TwitchChat] No bit trigger found for ${bits} bits`);
      return null;
    }
    
    // Check if it's a dedicated trigger (bits-only, not a command)
    if (bitTrigger.is_dedicated && bitTrigger.dedicated_gif_url) {
      console.log(`[TwitchChat] Found dedicated bit trigger: ${bitTrigger.bit_amount} bits -> dedicated GIF`);
      
      const position = (bitTrigger.dedicated_gif_position && String(bitTrigger.dedicated_gif_position).trim() !== '') 
        ? String(bitTrigger.dedicated_gif_position).trim() 
        : 'center';
      const size = (bitTrigger.dedicated_gif_size && String(bitTrigger.dedicated_gif_size).trim() !== '') 
        ? String(bitTrigger.dedicated_gif_size).trim() 
        : 'medium';
      
      const commandData = {
        type: 'gif_command',
        command: 'bits_thank_you', // Special command name for dedicated triggers
        gifUrl: bitTrigger.dedicated_gif_url,
        gifId: bitTrigger.dedicated_gif_id || null,
        duration: bitTrigger.dedicated_gif_duration || 5000,
        position: position,
        size: size,
        id: null, // No command ID for dedicated triggers
        triggeredBy: 'bits',
        bits: bits,
        username: username,
        isDedicated: true
      };
      
      console.log(`[TwitchChat] Broadcasting dedicated GIF with position: "${commandData.position}", size: "${commandData.size}"`);
      broadcastCommandTrigger(twitchUserId, commandData);
      return { type: 'gif', command: 'bits_thank_you', isDedicated: true };
    }
    
    console.log(`[TwitchChat] Found bit trigger: ${bitTrigger.bit_amount} bits -> ${bitTrigger.command_type} command ${bitTrigger.command_id}`);
    
    // Get the full command details based on type
    if (bitTrigger.command_type === 'audio') {
      const { getAudioCommandById } = await import('../models/audioCommand.js');
      const audioCommand = await getAudioCommandById(bitTrigger.command_id, null);
      
      if (audioCommand && audioCommand.is_active) {
        broadcastCommandTrigger(twitchUserId, {
          type: 'audio_command',
          command: audioCommand.command,
          filePath: audioCommand.file_path,
          volume: audioCommand.volume,
          id: audioCommand.id,
          triggeredBy: 'bits',
          bits: bits,
          username: username
        });
        return { type: 'audio', command: audioCommand.command };
      }
    } else if (bitTrigger.command_type === 'gif') {
      const { getGifCommandById } = await import('../models/gifCommand.js');
      const gifCommand = await getGifCommandById(bitTrigger.command_id, null);
      
      if (gifCommand && gifCommand.is_active) {
        console.log(`[TwitchChat] GIF command details:`, {
          command: gifCommand.command,
          position: gifCommand.position,
          size: gifCommand.size,
          hasPosition: gifCommand.position !== null && gifCommand.position !== undefined,
          hasSize: gifCommand.size !== null && gifCommand.size !== undefined
        });
        
        // Ensure position and size are valid strings, not null/undefined
        const position = (gifCommand.position && String(gifCommand.position).trim() !== '') 
          ? String(gifCommand.position).trim() 
          : 'center';
        const size = (gifCommand.size && String(gifCommand.size).trim() !== '') 
          ? String(gifCommand.size).trim() 
          : 'medium';
        
        const commandData = {
          type: 'gif_command',
          command: gifCommand.command,
          gifUrl: gifCommand.gif_url,
          gifId: gifCommand.gif_id,
          duration: gifCommand.duration,
          position: position,
          size: size,
          id: gifCommand.id,
          triggeredBy: 'bits',
          bits: bits,
          username: username
        };
        
        console.log(`[TwitchChat] Broadcasting GIF command with position: "${commandData.position}", size: "${commandData.size}"`);
        console.log(`[TwitchChat] Full commandData:`, JSON.stringify(commandData, null, 2));
        broadcastCommandTrigger(twitchUserId, commandData);
        return { type: 'gif', command: gifCommand.command };
      }
    }
    
    return null;
  } catch (error) {
    console.error(`[TwitchChat] Error processing bits donation:`, error);
    return null;
  }
}

/**
 * Set up the message handler for a Twitch chat connection
 */
function setupMessageHandler(connection, twitchUserId, onMessage) {
  // Remove any existing message handlers first
  connection.client.removeAllListeners('message');
  
  // Set up message handler
  connection.client.on('message', async (channel, tags, message, self) => {
      console.log(`[TwitchChat] ========================================`);
      console.log(`[TwitchChat] Message received in channel: ${channel}`);
      console.log(`[TwitchChat] From user: ${tags.username}`);
      console.log(`[TwitchChat] Message: "${message}"`);
      console.log(`[TwitchChat] Is self (bot): ${self}`);
      console.log(`[TwitchChat] Twitch user ID for this connection: ${twitchUserId}`);
      
      const chatMessage = {
        id: tags.id || Date.now().toString(),
        username: tags.username || 'unknown',
        displayName: tags['display-name'] || tags.username || 'unknown',
        message: message,
        timestamp: new Date().toISOString(),
        badges: tags.badges || {},
        color: tags.color || '#FFFFFF',
        channel: channel.replace('#', '')
      };

      // Update last message time to track connection activity
      connection.lastMessageTime = Date.now();
      
      // Add to message history (keep last 100 messages)
      connection.messageHistory.push(chatMessage);
      if (connection.messageHistory.length > 100) {
        connection.messageHistory.shift();
      }

      // Process commands (only if not from bot itself)
      if (!self) {
        // Check for bits in the message (bits are included in tags.bits)
        if (tags.bits && parseInt(tags.bits) > 0) {
          const bits = parseInt(tags.bits);
          console.log(`[TwitchChat] Bits detected in message: ${bits} bits from ${tags.username}`);
          const bitsResult = await processBitsDonation(twitchUserId, bits, tags.username || 'unknown');
          if (bitsResult) {
            console.log(`[TwitchChat] ✓ Bits donation processed: ${bitsResult.type} - ${bitsResult.command}`);
          }
        }
        
        // Process text commands
        console.log(`[TwitchChat] Processing command for user ${twitchUserId}, message: "${message}"`);
        const commandResult = await processCommand(twitchUserId, message);
        if (commandResult) {
          console.log(`[TwitchChat] ✓ Command processed: ${commandResult.type} - ${commandResult.command}`);
        } else {
          console.log(`[TwitchChat] ✗ No command handler found for: "${message}"`);
        }
      } else {
        console.log(`[TwitchChat] Ignoring message from bot itself`);
      }
      console.log(`[TwitchChat] ========================================`);

      // Call the callback if provided
      if (onMessage) {
        onMessage(chatMessage);
      }

      // Broadcast to WebSocket clients
      broadcastMessage(twitchUserId, chatMessage);
    });
}

/**
 * Connect to Twitch chat for a user
 */
export async function connectToChat(twitchUserId, username, accessToken = null, onMessage = null) {
  try {
    const connection = await getChatClient(twitchUserId, username, accessToken);
    
    // Always reload command handlers in case they've changed
    await setupCommandHandlers(twitchUserId);
    
    // If already connected, remove old message handlers to ensure we use the latest code
    if (connection.connected) {
      console.log(`[TwitchChat] Connection already exists and is connected for user ${twitchUserId}`);
      console.log(`[TwitchChat] Removing old message handlers and setting up new ones...`);
    }

    // Set up message handler (always, even if connection already exists)
    setupMessageHandler(connection, twitchUserId, onMessage);
    
    // Set up cheer (bits) handler
    connection.client.removeAllListeners('cheer');
    connection.client.on('cheer', async (channel, userstate, message) => {
      console.log(`[TwitchChat] ========================================`);
      console.log(`[TwitchChat] Cheer (bits) received in channel: ${channel}`);
      console.log(`[TwitchChat] From user: ${userstate.username}`);
      console.log(`[TwitchChat] Bits: ${userstate.bits}`);
      console.log(`[TwitchChat] Message: "${message}"`);
      
      if (userstate.bits && parseInt(userstate.bits) > 0) {
        const bits = parseInt(userstate.bits);
        const bitsResult = await processBitsDonation(twitchUserId, bits, userstate.username || 'unknown');
        if (bitsResult) {
          console.log(`[TwitchChat] ✓ Bits donation processed: ${bitsResult.type} - ${bitsResult.command}`);
        } else {
          console.log(`[TwitchChat] ✗ No bit trigger found for ${bits} bits`);
        }
      }
      console.log(`[TwitchChat] ========================================`);
    });

    // Handle connection events
    connection.client.on('connected', async (addr, port) => {
      console.log(`[Chat] Connected to Twitch chat for ${username} at ${addr}:${port}`);
      connection.connected = true;
      connection.reconnectAttempts = 0;
      connection.recreationAttempts = 0; // Reset recreation attempts on successful connection
      connection.consecutiveFailures = 0; // Reset failure counter
      connection.connectionStartTime = Date.now();
      connection.lastMessageTime = Date.now();
      
      // Ensure message handler is set up (in case of reconnection)
      console.log(`[TwitchChat] Ensuring message handler is set up for user ${twitchUserId} after connection`);
      setupMessageHandler(connection, twitchUserId, onMessage);
      
      // Re-setup cheer handler on reconnection
      connection.client.removeAllListeners('cheer');
      connection.client.on('cheer', async (channel, userstate, message) => {
        console.log(`[TwitchChat] Cheer (bits) received: ${userstate.bits} bits from ${userstate.username}`);
        if (userstate.bits && parseInt(userstate.bits) > 0) {
          const bits = parseInt(userstate.bits);
          await processBitsDonation(twitchUserId, bits, userstate.username || 'unknown');
        }
      });
      
      // Reload command handlers after reconnection
      await setupCommandHandlers(twitchUserId);
      
      // Set up keep-alive monitoring
      setupKeepAlive(twitchUserId, connection);
    });

    connection.client.on('disconnected', (reason) => {
      console.log(`[Chat] Disconnected from Twitch chat for ${username}:`, reason);
      connection.connected = false;
      
      // If disconnected due to authentication failure, remove connection to prevent reconnection loops
      if (reason && (reason.toLowerCase().includes('login') || reason.toLowerCase().includes('authentication') || reason.toLowerCase().includes('invalid'))) {
        console.error(`[TwitchChat] Authentication failure detected for user ${twitchUserId}. Removing connection.`);
        activeConnections.delete(twitchUserId);
        
        // Clear keep-alive interval
        if (keepAliveIntervals.has(twitchUserId)) {
          clearInterval(keepAliveIntervals.get(twitchUserId));
          keepAliveIntervals.delete(twitchUserId);
        }
        
        // Disable reconnection for this client
        if (connection.client) {
          connection.client.opts.connection.reconnect = false;
        }
      }
      
      // Clear keep-alive interval
      if (keepAliveIntervals.has(twitchUserId)) {
        clearInterval(keepAliveIntervals.get(twitchUserId));
        keepAliveIntervals.delete(twitchUserId);
      }
    });

    connection.client.on('reconnect', () => {
      connection.reconnectAttempts++;
      console.log(`[Chat] Reconnecting to Twitch chat for ${username} (attempt ${connection.reconnectAttempts})`);
      
      // Reset connection start time on reconnect
      connection.connectionStartTime = Date.now();
    });

    // Handle connection errors
    connection.client.on('join', (channel, username, self) => {
      if (self) {
        console.log(`[Chat] Successfully joined channel ${channel} for ${username}`);
        connection.connected = true;
      }
    });

    connection.client.on('part', (channel, username, self) => {
      if (self) {
        console.log(`[Chat] Left channel ${channel} for ${username}`);
      }
    });

    // Handle connection errors
    connection.client.on('notice', (channel, msgid, message) => {
      console.log(`Twitch notice for ${username}:`, msgid, message);
      
      // Handle authentication failures
      if (msgid === 'login_failed' || message?.toLowerCase().includes('login authentication failed')) {
        console.error(`[TwitchChat] Authentication failed for user ${twitchUserId}. Clearing connection.`);
        connection.connected = false;
        
        // Disconnect and remove the connection
        connection.client.disconnect().catch(() => {});
        activeConnections.delete(twitchUserId);
        
        // Clear keep-alive interval
        if (keepAliveIntervals.has(twitchUserId)) {
          clearInterval(keepAliveIntervals.get(twitchUserId));
          keepAliveIntervals.delete(twitchUserId);
        }
      }
    });
    
    // Handle logon errors (authentication failures)
    connection.client.on('logon', () => {
      // Successful logon - connection is authenticated
      console.log(`[TwitchChat] Successfully authenticated for user ${twitchUserId}`);
    });

    // Connect to chat
    try {
      await connection.client.connect();
    } catch (error) {
      // If connection fails due to authentication, clear it
      if (error.message?.toLowerCase().includes('login') || error.message?.toLowerCase().includes('authentication')) {
        console.error(`[TwitchChat] Authentication error during connect for user ${twitchUserId}:`, error.message);
        activeConnections.delete(twitchUserId);
        
        // Clear keep-alive interval
        if (keepAliveIntervals.has(twitchUserId)) {
          clearInterval(keepAliveIntervals.get(twitchUserId));
          keepAliveIntervals.delete(twitchUserId);
        }
      }
      throw error;
    }
    
    return connection;
  } catch (error) {
    console.error('Error connecting to Twitch chat:', error);
    throw error;
  }
}

/**
 * Disconnect from Twitch chat for a user
 */
export async function disconnectFromChat(twitchUserId) {
  const connection = activeConnections.get(twitchUserId);
  if (connection && connection.client) {
    await connection.client.disconnect();
    activeConnections.delete(twitchUserId);
    
    // Clear keep-alive interval
    if (keepAliveIntervals.has(twitchUserId)) {
      clearInterval(keepAliveIntervals.get(twitchUserId));
      keepAliveIntervals.delete(twitchUserId);
    }
    
    // Clear command handlers
    commandHandlers.delete(twitchUserId);
    
    return true;
  }
  return false;
}

/**
 * Reload command handlers for a user (call after adding/updating/deleting commands)
 */
export async function reloadCommandHandlers(twitchUserId) {
  await setupCommandHandlers(twitchUserId);
}

/**
 * Get chat connection status for a user
 */
export function getChatStatus(twitchUserId) {
  const connection = activeConnections.get(twitchUserId);
  if (!connection) {
    return { connected: false, channel: null };
  }
  return {
    connected: connection.connected,
    channel: connection.channel,
    messageCount: connection.messageHistory.length
  };
}

/**
 * Get message history for a user
 */
export function getMessageHistory(twitchUserId) {
  const connection = activeConnections.get(twitchUserId);
  if (!connection) {
    return [];
  }
  return connection.messageHistory;
}

/**
 * Send a message to chat
 */
export async function sendChatMessage(twitchUserId, message) {
  const connection = activeConnections.get(twitchUserId);
  if (!connection || !connection.connected) {
    throw new Error('Not connected to chat');
  }
  
  await connection.client.say(connection.channel, message);
}

