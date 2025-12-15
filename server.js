import express from 'express';
import session from 'express-session';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import authRoutes from './routes/auth.js';
import indexRoutes from './routes/index.js';
import dashboardRoutes from './routes/dashboard.js';
import chatRoutes from './routes/chat.js';
import audioCommandRoutes from './routes/audioCommands.js';
import obsTokenRoutes from './routes/obsToken.js';
import obsSourceRoutes from './routes/obsSource.js';
import { WebSocketServer } from 'ws';
import http from 'http';
import { setWebSocketServer } from './services/twitchChat.js';
import { getObsTokenByToken } from './models/obsToken.js';

dotenv.config();

const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PORT = process.env.PORT || 3000;

// Create HTTP server for WebSocket support
const server = http.createServer(app);

// Session configuration
app.use(session({
  secret: process.env.SESSION_SECRET || 'your-secret-key-change-this',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// API Routes - MUST come before static files to avoid 404s
app.use('/api/chat', chatRoutes);
app.use('/api/audio-commands', (req, res, next) => {
  console.log(`[ROUTE DEBUG] /api/audio-commands - Method: ${req.method}, Path: ${req.path}, OriginalUrl: ${req.originalUrl}`);
  next();
}, audioCommandRoutes);
app.use('/api/obs-token', (req, res, next) => {
  console.log(`[ROUTE DEBUG] /api/obs-token - Method: ${req.method}, Path: ${req.path}, OriginalUrl: ${req.originalUrl}`);
  next();
}, obsTokenRoutes);
app.use('/auth', authRoutes);
app.use('/obs-source', obsSourceRoutes);
app.use('/dashboard', dashboardRoutes);
app.use('/', indexRoutes);

// Static files - comes after routes to avoid catching API requests
app.use(express.static(path.join(__dirname, 'public')));

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).send('Internal Server Error');
});

// WebSocket server for real-time chat updates
const wss = new WebSocketServer({ server });

wss.on('connection', (ws, req) => {
  ws.isAuthenticated = false;
  ws.userId = null;
  ws.isObsSource = false;

  ws.on('message', async (message) => {
    try {
      const data = JSON.parse(message.toString());
      
      // Handle OBS browser source authentication
      if (data.type === 'obs_authenticate') {
        const token = data.token;
        
        if (!token) {
          ws.send(JSON.stringify({ 
            type: 'obs_auth_failed', 
            message: 'Token is required' 
          }));
          ws.close();
          return;
        }

        // Validate token
        console.log(`[WebSocket] Attempting to authenticate OBS source with token: ${token.substring(0, 10)}...`);
        const tokenData = await getObsTokenByToken(token);
        
        if (!tokenData) {
          console.error(`[WebSocket] Token not found in database: ${token.substring(0, 10)}...`);
          ws.send(JSON.stringify({ 
            type: 'obs_auth_failed', 
            message: 'Invalid token - token not found in database. Please regenerate your token in the dashboard.' 
          }));
          ws.close();
          return;
        }
        
        console.log(`[WebSocket] Token found for user: ${tokenData.twitch_user_id}`);

        // Authenticate OBS source
        ws.isAuthenticated = true;
        ws.userId = tokenData.twitch_user_id;
        ws.isObsSource = true;
        
        ws.send(JSON.stringify({ 
          type: 'obs_authenticated', 
          message: 'OBS browser source authenticated successfully' 
        }));
        
        console.log(`[WebSocket] OBS browser source authenticated for user ${tokenData.twitch_user_id}`);
      }
      // Handle regular dashboard WebSocket subscription
      else if (data.type === 'subscribe') {
        // Store user ID with WebSocket connection (for dashboard)
        ws.userId = data.userId;
        ws.isAuthenticated = true;
        ws.isObsSource = false;
        ws.send(JSON.stringify({ 
          type: 'subscribed', 
          message: 'Subscribed to chat updates' 
        }));
      }
    } catch (error) {
      console.error('WebSocket error:', error);
      if (!ws.isObsSource) {
        ws.send(JSON.stringify({ 
          type: 'error', 
          message: 'WebSocket error occurred' 
        }));
      }
    }
  });

  ws.on('close', () => {
    if (ws.isObsSource) {
      console.log(`[WebSocket] OBS browser source disconnected for user ${ws.userId}`);
    } else {
      console.log(`[WebSocket] Dashboard client disconnected for user ${ws.userId}`);
    }
  });
});

// Store WebSocket server for chat service to broadcast messages
app.locals.wss = wss;
setWebSocketServer(wss);

// Start server
server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

