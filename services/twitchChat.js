import tmi from 'tmi.js';
import { getUserByTwitchId } from '../models/user.js';
import { twitchConfig } from '../config/twitch.js';
import { getActiveAudioCommandsByTwitchUserId } from '../models/audioCommand.js';
import { getActiveGifCommandsByTwitchUserId } from '../models/gifCommand.js';

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
    console.log(`[TwitchChat] Loading command handlers for user ${twitchUserId}`);
    console.log(`[TwitchChat] Found ${audioCommands.length} audio commands`);
    console.log(`[TwitchChat] Found ${gifCommands.length} GIF commands`);
    
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
      position: handler.position
    });
    broadcastCommandTrigger(twitchUserId, {
      type: 'gif_command',
      command: handler.command,
      gifUrl: handler.gifUrl,
      gifId: handler.gifId,
      duration: handler.duration,
      position: handler.position || 'center',
      size: handler.size || 'medium',
      id: handler.id
    });
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
  console.log(`[Chat] Command data:`, commandData);
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
        console.log(`[Chat] Sending message to client:`, message);
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
      
      // Reload command handlers after reconnection
      await setupCommandHandlers(twitchUserId);
      
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

