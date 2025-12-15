import tmi from 'tmi.js';
import { getUserByTwitchId } from '../models/user.js';
import { twitchConfig } from '../config/twitch.js';
import { getActiveAudioCommandsByTwitchUserId } from '../models/audioCommand.js';

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
    return activeConnections.get(twitchUserId);
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
    messageHistory: [],
    lastPingTime: Date.now(),
    lastMessageTime: Date.now(), // Track last message received to detect stale connections
    reconnectAttempts: 0,
    connectionStartTime: Date.now()
  });

  return activeConnections.get(twitchUserId);
}

/**
 * Load and set up command handlers for a user
 */
async function setupCommandHandlers(twitchUserId) {
  try {
    const audioCommands = await getActiveAudioCommandsByTwitchUserId(twitchUserId);
    const handlers = new Map();
    
    audioCommands.forEach(cmd => {
      handlers.set(cmd.command.toLowerCase(), {
        type: 'audio',
        command: cmd.command,
        filePath: cmd.file_path,
        volume: cmd.volume,
        id: cmd.id
      });
    });
    
    commandHandlers.set(twitchUserId, handlers);
    return handlers;
  } catch (error) {
    console.error(`Error loading command handlers for user ${twitchUserId}:`, error);
    return new Map();
  }
}

/**
 * Check if a message matches any command and trigger appropriate handler
 */
async function processCommand(twitchUserId, message) {
  const handlers = commandHandlers.get(twitchUserId) || await setupCommandHandlers(twitchUserId);
  
  // Extract command from message (commands start with !)
  const words = message.trim().split(/\s+/);
  if (words.length === 0 || !words[0].startsWith('!')) {
    return null;
  }
  
  const command = words[0].toLowerCase();
  const handler = handlers.get(command);
  
  if (!handler) {
    return null;
  }
  
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
  }
  
  return handler;
}

/**
 * Broadcast command trigger to WebSocket clients
 */
function broadcastCommandTrigger(twitchUserId, commandData) {
  if (!wss) return;
  
  wss.clients.forEach((client) => {
    if (client.userId && String(client.userId) === String(twitchUserId) && client.readyState === 1) {
      client.send(JSON.stringify({
        type: 'command_trigger',
        command: commandData
      }));
    }
  });
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
  
  // Health check every 2 minutes to ensure connection is alive
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
        console.log(`[Keep-Alive] Connection state mismatch for ${twitchUserId}, state: ${readyState}`);
        connection.connected = false;
        
        // Attempt reconnection
        if (connection.reconnectAttempts < 5) {
          console.log(`[Keep-Alive] Attempting to reconnect ${twitchUserId}...`);
          connection.client.reconnect();
        } else {
          console.error(`[Keep-Alive] Max reconnection attempts reached for ${twitchUserId}`);
        }
      }
      
      // Check if we've received messages recently (within last 10 minutes)
      // If not, the connection might be stale even if state says OPEN
      const timeSinceLastMessage = now - connection.lastMessageTime;
      if (isConnected && timeSinceLastMessage > 10 * 60 * 1000) {
        // No messages in 10 minutes - connection might be stale
        // Send a test message or verify connection by checking channel
        console.log(`[Keep-Alive] No messages received in ${Math.round(timeSinceLastMessage / 1000)}s for ${twitchUserId}, verifying connection...`);
        // The tmi.js library handles PING/PONG automatically, but we can verify by checking state
      }
      
      // Log connection health periodically
      if (isConnected) {
        const uptime = Math.round((now - connection.connectionStartTime) / 1000);
        console.log(`[Keep-Alive] Connection healthy for ${twitchUserId} - Uptime: ${uptime}s, Messages: ${connection.messageHistory.length}`);
      }
      
    } catch (error) {
      console.error(`[Keep-Alive] Error checking connection health for ${twitchUserId}:`, error);
      // If error checking state, try to reconnect
      if (connection.connected) {
        connection.connected = false;
        connection.client.reconnect();
      }
    }
  }, 2 * 60 * 1000); // Check every 2 minutes
  
  keepAliveIntervals.set(twitchUserId, interval);
  console.log(`[Keep-Alive] Keep-alive monitoring started for ${twitchUserId}`);
}

/**
 * Connect to Twitch chat for a user
 */
export async function connectToChat(twitchUserId, username, accessToken = null, onMessage = null) {
  try {
    const connection = await getChatClient(twitchUserId, username, accessToken);
    
    if (connection.connected) {
      // Reload command handlers in case they've changed
      await setupCommandHandlers(twitchUserId);
      return connection;
    }

    // Load command handlers for this user
    await setupCommandHandlers(twitchUserId);

    // Set up message handler
    connection.client.on('message', async (channel, tags, message, self) => {
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
        await processCommand(twitchUserId, message);
      }

      // Call the callback if provided
      if (onMessage) {
        onMessage(chatMessage);
      }

      // Broadcast to WebSocket clients
      broadcastMessage(twitchUserId, chatMessage);
    });

    // Handle connection events
    connection.client.on('connected', (addr, port) => {
      console.log(`[Chat] Connected to Twitch chat for ${username} at ${addr}:${port}`);
      connection.connected = true;
      connection.reconnectAttempts = 0;
      connection.connectionStartTime = Date.now();
      connection.lastMessageTime = Date.now();
      
      // Set up keep-alive monitoring
      setupKeepAlive(twitchUserId, connection);
    });

    connection.client.on('disconnected', (reason) => {
      console.log(`[Chat] Disconnected from Twitch chat for ${username}:`, reason);
      connection.connected = false;
      
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
    });

    // Connect to chat
    await connection.client.connect();
    
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

