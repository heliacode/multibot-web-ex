import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const router = express.Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * OBS Browser Source Page
 * This page is loaded by OBS browser sources
 * It receives a token in the query string to identify the user
 */
router.get('/', async (req, res) => {
  try {
    const { token, showFeedback } = req.query;
    
    if (!token) {
      // Check if user is logged in - if so, try to auto-generate token
      const twitchUserId = req.session?.userId;
      let autoTokenUrl = null;
      
      if (twitchUserId) {
        try {
          const { getUserByTwitchId } = await import('../models/user.js');
          const { getOrCreateObsToken } = await import('../models/obsToken.js');
          const user = await getUserByTwitchId(twitchUserId);
          
          if (user && user.id) {
            const tokenData = await getOrCreateObsToken(user.id, twitchUserId);
            const protocol = req.protocol;
            const host = req.get('host');
            const showFeedbackParam = showFeedback !== undefined ? `&showFeedback=${showFeedback}` : '&showFeedback=true';
            autoTokenUrl = `${protocol}://${host}/obs-source?token=${tokenData.token}${showFeedbackParam}`;
          }
        } catch (error) {
          // If auto-generation fails, just show the error page
          console.error('Error auto-generating token:', error);
        }
      }
      
      return res.status(400).send(`
        <html>
          <head>
            <title>OBS Browser Source - Error</title>
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
              body {
                font-family: Arial, sans-serif;
                text-align: center;
                padding: 20px;
                background: #1a1a1a;
                color: white;
                display: flex;
                flex-direction: column;
                justify-content: center;
                align-items: center;
                min-height: 100vh;
                margin: 0;
              }
              .error-container {
                max-width: 600px;
                padding: 40px;
                background: rgba(255, 255, 255, 0.1);
                border-radius: 10px;
                box-shadow: 0 4px 6px rgba(0, 0, 0, 0.3);
              }
              h1 {
                color: #ff4444;
                margin-bottom: 20px;
                font-size: 32px;
              }
              p {
                margin: 15px 0;
                font-size: 16px;
                line-height: 1.6;
              }
              .code {
                background: rgba(0, 0, 0, 0.3);
                padding: 10px 15px;
                border-radius: 5px;
                font-family: 'Courier New', monospace;
                margin: 10px 0;
                display: inline-block;
                word-break: break-all;
                max-width: 100%;
              }
              .btn {
                display: inline-block;
                margin: 10px 5px;
                padding: 12px 24px;
                background: #9146ff;
                color: white;
                text-decoration: none;
                border-radius: 5px;
                font-weight: bold;
                transition: background 0.3s;
                border: none;
                cursor: pointer;
                font-size: 16px;
              }
              .btn:hover {
                background: #772ce8;
              }
              .btn-success {
                background: #10b981;
              }
              .btn-success:hover {
                background: #059669;
              }
              .steps {
                text-align: left;
                margin: 20px 0;
                padding-left: 20px;
              }
              .steps li {
                margin: 10px 0;
              }
              .auto-token-section {
                margin-top: 30px;
                padding: 20px;
                background: rgba(16, 185, 129, 0.1);
                border-radius: 8px;
                border: 1px solid rgba(16, 185, 129, 0.3);
              }
              @media (max-width: 640px) {
                .error-container {
                  padding: 20px;
                }
                h1 {
                  font-size: 24px;
                }
                .code {
                  font-size: 12px;
                  padding: 8px;
                }
              }
            </style>
          </head>
          <body>
            <div class="error-container">
              <h1>Error: Missing Token</h1>
              <p>This OBS Browser Source requires a token to identify your account.</p>
              ${autoTokenUrl ? `
                <div class="auto-token-section">
                  <p><strong>✓ Token Generated!</strong></p>
                  <p>Your OBS Browser Source URL:</p>
                  <div class="code">${autoTokenUrl}</div>
                  <p style="font-size: 14px; margin-top: 15px;">Copy this URL and use it in your OBS Browser Source settings.</p>
                  <button class="btn btn-success" onclick="navigator.clipboard.writeText('${autoTokenUrl}').then(() => alert('URL copied to clipboard!')).catch(() => alert('Failed to copy. Please copy manually.'))">
                    Copy URL
                  </button>
                </div>
              ` : `
                <p><strong>To get your token:</strong></p>
                <ol class="steps">
                  <li>Go to your <a href="/dashboard" style="color: #9146ff;">MultiBot Dashboard</a></li>
                  <li>Scroll to the "OBS Setup" section</li>
                  <li>Click "Generate OBS Token" if you haven't already</li>
                  <li>Copy the URL shown (it will look like: <span class="code">/obs-source?token=YOUR_TOKEN</span>)</li>
                  <li>Use that complete URL in your OBS Browser Source</li>
                </ol>
                <a href="/dashboard" class="btn">Go to Dashboard</a>
              `}
            </div>
          </body>
        </html>
      `);
    }

    // Read the OBS source HTML file
    const fs = await import('fs');
    let obsHtml = fs.readFileSync(
      path.join(__dirname, '../public/obs-source.html'),
      'utf8'
    );

    // Replace token placeholder
    obsHtml = obsHtml.replace(/\{\{TOKEN\}\}/g, token);
    
    // Replace showFeedback placeholder (default to true if not specified)
    const shouldShowFeedback = showFeedback !== 'false' && showFeedback !== '0';
    obsHtml = obsHtml.replace(/\{\{SHOW_FEEDBACK\}\}/g, shouldShowFeedback ? 'true' : 'false');
    
    res.send(obsHtml);
  } catch (error) {
    console.error('Error loading OBS source:', error);
    res.status(500).send('Error loading OBS browser source');
  }
});

export default router;

