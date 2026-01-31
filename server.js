import express from 'express';
import session from 'express-session';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import authRoutes from './routes/auth.js';
import indexRoutes from './routes/index.js';
import dashboardRoutes from './routes/dashboard.js';
import chatRoutes from './routes/chat.js';
import audioCommandRoutes from './routes/audioCommands.js';
import gifCommandRoutes from './routes/gifCommands.js';
import animatedTextCommandRoutes from './routes/animatedTextCommands.js';
import obsTokenRoutes from './routes/obsToken.js';
import obsSourceRoutes from './routes/obsSource.js';
import imageRoutes from './routes/images.js';
import designRoutes from './routes/design.js';
import testRoutes from './routes/test.js';
import bitTriggerRoutes from './routes/bitTriggers.js';
import { WebSocketServer } from 'ws';
import http from 'http';
import { setWebSocketServer } from './services/twitchChat.js';
import { getObsTokenByToken } from './models/obsToken.js';

dotenv.config();

// Ensure upload directories exist
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadsDir = path.join(__dirname, 'public', 'uploads', 'audio');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
  console.log(`[Server] Created uploads directory: ${uploadsDir}`);
}

const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PORT = process.env.PORT || 3000;
const IS_PROD = process.env.NODE_ENV === 'production';

// Railway (and most PaaS) run behind a reverse proxy / TLS terminator.
// This is required for secure cookies + correct client IP handling.
if (IS_PROD) {
  app.set('trust proxy', 1);
}

// Fail fast in production if critical secrets are missing (prevents "it deploys but auth is broken").
if (IS_PROD && !process.env.SESSION_SECRET) {
  console.error('[BOOT] Missing SESSION_SECRET (required in production).');
  process.exit(1);
}

// Create HTTP server for WebSocket support
const server = http.createServer(app);

// Session configuration
app.use(session({
  secret: process.env.SESSION_SECRET || 'dev-only-secret-change-me',
  resave: false,
  saveUninitialized: false,
  proxy: IS_PROD,
  cookie: {
    secure: IS_PROD,
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check (used by Railway and uptime monitors)
// Keep it simple and fast - Railway needs quick responses
app.get('/healthz', (req, res) => {
  res.status(200).json({ 
    ok: true, 
    timestamp: new Date().toISOString()
  });
});

// API Routes - MUST come before static files to avoid 404s
app.use('/api/chat', chatRoutes);
app.use('/api/audio-commands', (req, res, next) => {
  console.log(`[ROUTE DEBUG] /api/audio-commands - Method: ${req.method}, Path: ${req.path}, OriginalUrl: ${req.originalUrl}`);
  next();
}, audioCommandRoutes);
app.use('/api/gif-commands', gifCommandRoutes);
app.use('/api/animated-text-commands', animatedTextCommandRoutes);
app.use('/api/obs-token', (req, res, next) => {
  console.log(`[ROUTE DEBUG] /api/obs-token - Method: ${req.method}, Path: ${req.path}, OriginalUrl: ${req.originalUrl}`);
  next();
}, obsTokenRoutes);
app.use('/api/images', imageRoutes);
app.use('/api/design', designRoutes);
app.use('/api/test', testRoutes);
app.use('/api/bit-triggers', bitTriggerRoutes);
app.use('/auth', authRoutes);
app.use('/obs-source', obsSourceRoutes);
app.use('/dashboard', dashboardRoutes);
app.use('/', indexRoutes);

// Website static files (marketing site) - serve as root
app.use(express.static(path.join(__dirname, 'website')));

// Public static files (dashboard/app) - comes after website
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

        // Validate token - try both encoded and decoded versions
        console.log(`[WebSocket] Attempting to authenticate OBS source with token: ${token.substring(0, 10)}...`);
        let tokenData = await getObsTokenByToken(token);
        
        // If not found, try URL-decoded version (in case token was double-encoded)
        if (!tokenData) {
          try {
            const decodedToken = decodeURIComponent(token);
            if (decodedToken !== token) {
              tokenData = await getObsTokenByToken(decodedToken);
            }
          } catch (e) {
            // decodeURIComponent failed, continue with original token lookup result
          }
        }
        
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

// Store WebSocket server for chat service and design updates to broadcast messages
app.locals.wss = wss;
// Also store globally for design controller
global.wss = wss;
setWebSocketServer(wss);

// Start server
// Bind to 0.0.0.0 to accept connections from Railway's proxy
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on http://0.0.0.0:${PORT} (accessible on port ${PORT})`);
  console.log(`Health check available at http://0.0.0.0:${PORT}/healthz`);
});

