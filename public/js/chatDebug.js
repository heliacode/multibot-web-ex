/**
 * Chat Debug Functionality
 * Handles WebSocket connection for real-time chat monitoring
 */

let chatWebSocket = null;
let chatConnected = false;

function updateChatStatus(connected, channel = null) {
    const indicator = document.getElementById('status-indicator');
    const statusText = document.getElementById('status-text');
    const connectBtn = document.getElementById('chat-connect-btn');
    const disconnectBtn = document.getElementById('chat-disconnect-btn');

    if (connected) {
        indicator.className = 'w-3 h-3 rounded-full bg-green-500';
        statusText.textContent = channel ? `Connected to #${channel}` : 'Connected';
        connectBtn.style.display = 'none';
        disconnectBtn.style.display = 'block';
        chatConnected = true;
    } else {
        indicator.className = 'w-3 h-3 rounded-full bg-gray-500';
        statusText.textContent = 'Not connected';
        connectBtn.style.display = 'block';
        disconnectBtn.style.display = 'none';
        chatConnected = false;
    }
}

function addChatMessage(message) {
    const messagesContainer = document.getElementById('chat-messages');
    
    // Remove empty state if present
    const emptyState = messagesContainer.querySelector('.text-center');
    if (emptyState) {
        emptyState.remove();
    }

    const messageDiv = document.createElement('div');
    messageDiv.className = 'mb-3 p-3 glass-card rounded-lg';
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

        // Connect WebSocket for real-time updates
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${protocol}//${window.location.host}`;
        chatWebSocket = new WebSocket(wsUrl);

        chatWebSocket.onopen = () => {
            chatWebSocket.send(JSON.stringify({ 
                type: 'subscribe',
                userId: '{{USER_ID}}' // This will be replaced by server
            }));
            updateChatStatus(true, data.status.channel);
        };

        chatWebSocket.onmessage = (event) => {
            const data = JSON.parse(event.data);
            if (data.type === 'chat_message') {
                addChatMessage(data.message);
            } else if (data.type === 'command_trigger') {
                handleCommandTrigger(data.command);
            }
        };

        chatWebSocket.onerror = (error) => {
            console.error('WebSocket error:', error);
        };

        chatWebSocket.onclose = () => {
            updateChatStatus(false);
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
    // Check if chat section exists
    if (document.getElementById('chat-debug-section')) {
        // Wait a bit for page to fully load, then auto-connect
        setTimeout(async () => {
            try {
                // Check current status first
                const statusResponse = await fetch('/api/chat/status', {
                    credentials: 'include'
                });
                const statusData = await statusResponse.json();
                
                if (!statusData.connected) {
                    console.log('[Dashboard] Auto-connecting to chat...');
                    await connectToChat();
                } else {
                    console.log('[Dashboard] Chat already connected');
                    updateChatStatus(true, statusData.channel);
                    // Still connect WebSocket for updates
                    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
                    const wsUrl = `${protocol}//${window.location.host}`;
                    chatWebSocket = new WebSocket(wsUrl);
                    chatWebSocket.onopen = () => {
                        chatWebSocket.send(JSON.stringify({ 
                            type: 'subscribe',
                            userId: '{{USER_ID}}'
                        }));
                    };
                    chatWebSocket.onmessage = (event) => {
                        const data = JSON.parse(event.data);
                        if (data.type === 'chat_message') {
                            addChatMessage(data.message);
                        } else if (data.type === 'command_trigger') {
                            handleCommandTrigger(data.command);
                        }
                    };
                    // Load recent messages
                    if (statusData.history) {
                        statusData.history.forEach(msg => addChatMessage(msg));
                    }
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

