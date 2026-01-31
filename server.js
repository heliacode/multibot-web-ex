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

const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure upload directories exist
const uploadsDir = path.join(__dirname, 'public', 'uploads', 'audio');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
  console.log(`[Server] Created uploads directory: ${uploadsDir}`);
}
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

// Database health check endpoint
app.get('/api/health/database', async (req, res) => {
  try {
    // Check if DATABASE_URL is set
    if (!process.env.DATABASE_URL) {
      return res.status(503).json({
        ok: false,
        database: {
          connected: false,
          error: 'DATABASE_URL not configured',
          message: 'Please add a Postgres database in Railway and link it to this service'
        },
        timestamp: new Date().toISOString()
      });
    }

    // Check if pointing to localhost
    const dbUrl = process.env.DATABASE_URL;
    if (dbUrl.includes('localhost') || dbUrl.includes('127.0.0.1') || dbUrl.includes('::1')) {
      return res.status(503).json({
        ok: false,
        database: {
          connected: false,
          error: 'DATABASE_URL points to localhost',
          message: 'Railway Postgres should provide a remote database URL. Check Railway → Postgres Plugin → Connection Variables'
        },
        timestamp: new Date().toISOString()
      });
    }

    const pool = (await import('./config/database.js')).default;
    
    // Test basic connection with timeout
    const startTime = Date.now();
    try {
      await Promise.race([
        pool.query('SELECT 1'),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Connection timeout')), 5000))
      ]);
    } catch (connError) {
      const errorMsg = connError.message || 'Connection failed';
      const errorCode = connError.code || 'UNKNOWN';
      
      return res.status(503).json({
        ok: false,
        database: {
          connected: false,
          error: errorMsg,
          code: errorCode,
          message: errorCode === 'ECONNREFUSED' 
            ? 'Cannot connect to database. Check if Railway Postgres plugin is added and DATABASE_URL is set correctly.'
            : 'Database connection failed. Check Railway logs for details.'
        },
        timestamp: new Date().toISOString()
      });
    }
    
    const queryTime = Date.now() - startTime;
    
    // Check if users table exists and get count
    let userCount = 0;
    let tableExists = false;
    try {
      const result = await pool.query('SELECT COUNT(*) as count FROM users');
      userCount = parseInt(result.rows[0].count);
      tableExists = true;
    } catch (error) {
      // Table might not exist yet
      console.warn('[DB HEALTH] Users table check failed:', error.message);
    }
    
    res.json({
      ok: true,
      database: {
        connected: true,
        queryTime: `${queryTime}ms`,
        usersTableExists: tableExists,
        userCount: userCount
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('[DB HEALTH] Database health check failed:', error);
    res.status(503).json({
      ok: false,
      database: {
        connected: false,
        error: error.message || 'Unknown error',
        code: error.code || 'UNKNOWN',
        message: 'Database health check failed. Check Railway logs for details.'
      },
      timestamp: new Date().toISOString()
    });
  }
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
        const userId = data.userId;
        console.log(`[WebSocket] Dashboard subscription request from userId: ${userId}`);
        
        // Validate userId is not a placeholder
        if (!userId || userId === '{{USER_ID}}' || userId.trim() === '') {
          console.error('[WebSocket] Invalid userId in subscribe message:', userId);
          ws.send(JSON.stringify({ 
            type: 'error', 
            message: 'Invalid user ID. Please refresh the page.' 
          }));
          // Don't close - let them retry
          return;
        }
        
        ws.userId = String(userId);
        ws.isAuthenticated = true;
        ws.isObsSource = false;
        
        console.log(`[WebSocket] Dashboard client subscribed for user ${ws.userId}`);
        ws.send(JSON.stringify({ 
          type: 'subscribed', 
          message: 'Subscribed to chat updates',
          userId: ws.userId
        }));
      } else {
        console.warn(`[WebSocket] Unknown message type: ${data.type}`);
      }
    } catch (error) {
      console.error('[WebSocket] Error processing message:', error);
      console.error('[WebSocket] Error stack:', error.stack);
      try {
        if (!ws.isObsSource) {
          ws.send(JSON.stringify({ 
            type: 'error', 
            message: 'WebSocket error occurred',
            error: error.message
          }));
        }
      } catch (sendError) {
        console.error('[WebSocket] Failed to send error message:', sendError);
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

