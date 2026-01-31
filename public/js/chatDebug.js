/**
 * Chat Debug Functionality
 * Handles WebSocket connection for real-time chat monitoring
 */

let chatWebSocket = null;
let chatConnected = false;
let chatInitialized = false; // Prevent multiple initializations
let receivedMessageIds = new Set(); // Track received messages to prevent duplicates

function updateChatStatus(connected, channel = null) {
    const indicator = document.getElementById('status-indicator');
    const statusText = document.getElementById('status-text');
    const connectBtn = document.getElementById('chat-connect-btn');
    const disconnectBtn = document.getElementById('chat-disconnect-btn');
    const messagesContainer = document.getElementById('chat-messages');

    if (connected) {
        indicator.className = 'w-3 h-3 rounded-full bg-green-500';
        statusText.textContent = channel ? `Connected to #${channel}` : 'Connected';
        connectBtn.style.display = 'none';
        disconnectBtn.style.display = 'block';
        chatConnected = true;
        
        // Clear disconnected message if present
        const emptyState = messagesContainer.querySelector('.text-center');
        if (emptyState && emptyState.textContent.includes('Disconnected')) {
            emptyState.remove();
            // Show "No messages yet" if container is empty
            if (messagesContainer.children.length === 0) {
                messagesContainer.innerHTML = `
                    <div class="text-center text-white/50 py-8">
                        <i class="fas fa-comments text-4xl mb-2"></i>
                        <p>No messages yet. Waiting for chat messages...</p>
                    </div>
                `;
            }
        }
    } else {
        indicator.className = 'w-3 h-3 rounded-full bg-gray-500';
        statusText.textContent = 'Not connected';
        connectBtn.style.display = 'block';
        disconnectBtn.style.display = 'none';
        chatConnected = false;
        
        // Show disconnected message if messages container is empty
        if (!messagesContainer.querySelector('.text-center') || messagesContainer.children.length === 0) {
            messagesContainer.innerHTML = `
                <div class="text-center text-white/50 py-8">
                    <i class="fas fa-comments text-4xl mb-2"></i>
                    <p>Disconnected from chat.</p>
                </div>
            `;
        }
    }
}

function addChatMessage(message) {
    // Create a unique ID for this message to prevent duplicates
    // Use timestamp, username, and message content to create ID
    const messageId = `${message.timestamp}-${message.displayName}-${message.message}`;
    
    // Check if we've already processed this message
    if (receivedMessageIds.has(messageId)) {
        console.log('[Chat Debug] Duplicate message detected, skipping:', messageId);
        return;
    }
    
    // Mark this message as received
    receivedMessageIds.add(messageId);
    
    // Clean up old message IDs (keep only last 1000 to prevent memory issues)
    if (receivedMessageIds.size > 1000) {
        const idsArray = Array.from(receivedMessageIds);
        receivedMessageIds = new Set(idsArray.slice(-500)); // Keep last 500
    }
    
    const messagesContainer = document.getElementById('chat-messages');
    
    // Remove empty state if present
    const emptyState = messagesContainer.querySelector('.text-center');
    if (emptyState) {
        emptyState.remove();
    }

    const messageDiv = document.createElement('div');
    messageDiv.className = 'mb-3 p-3 glass-card rounded-lg';
    messageDiv.setAttribute('data-message-id', messageId); // Store ID for potential future use
    messageDiv.innerHTML = `
        <div class="flex items-start gap-3">
            <div class="flex-shrink-0">
                <div class="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-xs font-semibold text-white" style="background-color: ${message.color || '#FFFFFF'}20;">
                    ${message.displayName.charAt(0).toUpperCase()}
                </div>
            </div>
            <div class="flex-1">
                <div class="flex items-center gap-2 mb-1">
                    <span class="font-semibold text-white" style="color: ${message.color || '#FFFFFF'};">${message.displayName}</span>
                    <span class="text-xs text-white/50">${new Date(message.timestamp).toLocaleTimeString()}</span>
                </div>
                <p class="text-white/90">${escapeHtml(message.message)}</p>
            </div>
        </div>
    `;

    messagesContainer.appendChild(messageDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

async function connectToChat() {
    try {
        // Start chat connection
        const response = await fetch('/api/chat/start', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include'
        });

        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error || 'Failed to connect');
        }

        // Always close existing connection before creating a new one to prevent duplicates
        if (chatWebSocket) {
            console.log('[Chat Debug] Closing existing WebSocket connection (state:', chatWebSocket.readyState, ')');
            chatWebSocket.onmessage = null; // Remove old handlers
            chatWebSocket.onopen = null;
            chatWebSocket.onerror = null;
            chatWebSocket.onclose = null;
            if (chatWebSocket.readyState !== WebSocket.CLOSED) {
                chatWebSocket.close();
            }
            chatWebSocket = null;
        }

        // Connect WebSocket for real-time updates
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${protocol}//${window.location.host}`;
        chatWebSocket = new WebSocket(wsUrl);

        chatWebSocket.onopen = () => {
            console.log('[Chat Debug] WebSocket opened, sending subscribe message');
            // Get userId from window (injected by server) or try to get from session
            const userId = window.USER_ID;
            if (!userId || userId === '{{USER_ID}}') {
                console.error('[Chat Debug] USER_ID not available, WebSocket may not work properly');
                updateChatStatus(false);
                chatWebSocket.close();
                return;
            }
            
            console.log('[Chat Debug] Subscribing with userId:', userId);
            try {
                chatWebSocket.send(JSON.stringify({ 
                    type: 'subscribe',
                    userId: String(userId)
                }));
                updateChatStatus(true, data.status?.channel || null);
            } catch (error) {
                console.error('[Chat Debug] Error sending subscribe message:', error);
                updateChatStatus(false);
            }
        };

        chatWebSocket.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                console.log('[Chat Debug] WebSocket message received:', data.type);
                
                if (data.type === 'subscribed') {
                    console.log('[Chat Debug] Successfully subscribed to chat updates');
                    // Status already updated in onopen
                } else if (data.type === 'chat_message') {
                    addChatMessage(data.message);
                } else if (data.type === 'command_trigger') {
                    handleCommandTrigger(data.command);
                } else if (data.type === 'error') {
                    console.error('[Chat Debug] WebSocket error:', data.message);
                    if (data.message && data.message.includes('Invalid user ID')) {
                        // Refresh page to get new USER_ID
                        console.log('[Chat Debug] Invalid user ID, page may need refresh');
                    }
                }
            } catch (error) {
                console.error('[Chat Debug] Error parsing WebSocket message:', error);
            }
        };

        chatWebSocket.onerror = (error) => {
            console.error('[Chat Debug] WebSocket error:', error);
            console.error('[Chat Debug] WebSocket readyState:', chatWebSocket.readyState);
        };

        chatWebSocket.onclose = () => {
            console.log('[Chat Debug] WebSocket closed');
            // Only update status if we're sure the connection is lost
            // Check server status before marking as disconnected
            fetch('/api/chat/status', { credentials: 'include' })
                .then(res => res.json())
                .then(statusData => {
                    if (!statusData.status || !statusData.status.connected) {
                        updateChatStatus(false);
                    }
                })
                .catch(() => {
                    // If status check fails, assume disconnected
                    updateChatStatus(false);
                });
        };

        // Load recent messages
        const statusResponse = await fetch('/api/chat/status', {
            credentials: 'include'
        });
        const statusData = await statusResponse.json();
        if (statusData.history) {
            statusData.history.forEach(msg => addChatMessage(msg));
        }

    } catch (error) {
        console.error('Error connecting to chat:', error);
        // Don't show alert - chat auto-connects in background
        updateChatStatus(false, null);
    }
}

// Auto-connect to chat on page load
document.addEventListener('DOMContentLoaded', async () => {
    // Prevent multiple initializations
    if (chatInitialized) {
        console.log('[Chat Debug] Already initialized, skipping');
        return;
    }
    
    // Check if chat section exists
    if (document.getElementById('chat-debug-section')) {
        chatInitialized = true; // Mark as initialized
        // Wait a bit for page to fully load, then auto-connect
        setTimeout(async () => {
            try {
                // Check current status first
                const statusResponse = await fetch('/api/chat/status', {
                    credentials: 'include'
                });
                const statusData = await statusResponse.json();
                
                if (!statusData.status || !statusData.status.connected) {
                    console.log('[Dashboard] Auto-connecting to chat...');
                    updateChatStatus(false); // Ensure status is set to disconnected first
                    await connectToChat();
                } else {
                    console.log('[Dashboard] Chat already connected');
                    // Update status first
                    updateChatStatus(true, statusData.status.channel);
                    
                    // Always close existing connection before creating a new one to prevent duplicates
                    if (chatWebSocket) {
                        console.log('[Dashboard] Closing existing WebSocket connection (state:', chatWebSocket.readyState, ')');
                        chatWebSocket.onmessage = null; // Remove old handlers
                        chatWebSocket.onopen = null;
                        chatWebSocket.onerror = null;
                        chatWebSocket.onclose = null;
                        if (chatWebSocket.readyState !== WebSocket.CLOSED) {
                            chatWebSocket.close();
                        }
                        chatWebSocket = null;
                    }
                    
                    // Load recent messages before connecting WebSocket
                    if (statusData.history && statusData.history.length > 0) {
                        statusData.history.forEach(msg => addChatMessage(msg));
                    }
                    
                    // Connect WebSocket for real-time updates
                    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
                    const wsUrl = `${protocol}//${window.location.host}`;
                    chatWebSocket = new WebSocket(wsUrl);
                    
                    chatWebSocket.onopen = () => {
                        const userId = window.USER_ID;
                        if (!userId || userId === '{{USER_ID}}') {
                            console.error('[Dashboard] USER_ID not available for WebSocket subscription');
                            chatWebSocket.close();
                            return;
                        }
                        
                        console.log('[Dashboard] WebSocket opened, subscribing with userId:', userId);
                        try {
                            chatWebSocket.send(JSON.stringify({ 
                                type: 'subscribe',
                                userId: String(userId)
                            }));
                            console.log('[Dashboard] WebSocket connected for chat updates');
                        } catch (error) {
                            console.error('[Dashboard] Error sending WebSocket subscribe:', error);
                        }
                    };
                    
                    chatWebSocket.onmessage = (event) => {
                        try {
                            const data = JSON.parse(event.data);
                            console.log('[Dashboard] WebSocket message:', data.type);
                            
                            if (data.type === 'subscribed') {
                                console.log('[Dashboard] Successfully subscribed to chat updates');
                            } else if (data.type === 'chat_message') {
                                addChatMessage(data.message);
                            } else if (data.type === 'command_trigger') {
                                handleCommandTrigger(data.command);
                            } else if (data.type === 'error') {
                                console.error('[Dashboard] WebSocket error:', data.message);
                            }
                        } catch (error) {
                            console.error('[Dashboard] Error parsing WebSocket message:', error);
                        }
                    };
                    
                    chatWebSocket.onerror = (error) => {
                        console.error('[Dashboard] WebSocket error:', error);
                        console.error('[Dashboard] WebSocket readyState:', chatWebSocket.readyState);
                    };
                    
                    chatWebSocket.onclose = (event) => {
                        console.log('[Dashboard] WebSocket disconnected', {
                            code: event.code,
                            reason: event.reason,
                            wasClean: event.wasClean
                        });
                        
                        // Check if it was an unexpected disconnect
                        if (!event.wasClean && event.code !== 1000) {
                            console.warn('[Dashboard] WebSocket closed unexpectedly, will retry');
                            // Retry connection after a delay
                            setTimeout(() => {
                                if (document.getElementById('chat-debug-section')) {
                                    // Always close and clean up existing connection before retrying
                                    if (chatWebSocket) {
                                        chatWebSocket.onmessage = null;
                                        chatWebSocket.onopen = null;
                                        chatWebSocket.onerror = null;
                                        chatWebSocket.onclose = null;
                                        if (chatWebSocket.readyState !== WebSocket.CLOSED) {
                                            chatWebSocket.close();
                                        }
                                        chatWebSocket = null;
                                    }
                                    
                                    console.log('[Dashboard] Retrying WebSocket connection...');
                                    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
                                    const wsUrl = `${protocol}//${window.location.host}`;
                                    chatWebSocket = new WebSocket(wsUrl);
                                    // Re-attach handlers (same as above)
                                    chatWebSocket.onopen = () => {
                                        const userId = window.USER_ID;
                                        if (userId && userId !== '{{USER_ID}}') {
                                            chatWebSocket.send(JSON.stringify({ 
                                                type: 'subscribe',
                                                userId: String(userId)
                                            }));
                                        }
                                    };
                                    chatWebSocket.onmessage = (event) => {
                                        try {
                                            const data = JSON.parse(event.data);
                                            if (data.type === 'chat_message') {
                                                addChatMessage(data.message);
                                            } else if (data.type === 'command_trigger') {
                                                handleCommandTrigger(data.command);
                                            }
                                        } catch (error) {
                                            console.error('[Dashboard] Error parsing WebSocket message:', error);
                                        }
                                    };
                                }
                            }, 3000);
                        }
                    };
                }
            } catch (error) {
                console.error('[Dashboard] Auto-connect error:', error);
                // Silently fail - will retry on manual connect
            }
        }, 500);
    }
});

async function disconnectFromChat() {
    try {
        await fetch('/api/chat/stop', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include'
        });

        if (chatWebSocket) {
            chatWebSocket.close();
            chatWebSocket = null;
        }

        updateChatStatus(false);
        document.getElementById('chat-messages').innerHTML = `
            <div class="text-center text-white/50 py-8">
                <i class="fas fa-comments text-4xl mb-2"></i>
                <p>Disconnected from chat.</p>
            </div>
        `;
    } catch (error) {
        console.error('Error disconnecting from chat:', error);
    }
}

