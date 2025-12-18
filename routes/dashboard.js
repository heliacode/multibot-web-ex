import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { requireAuth } from '../middleware/auth.js';
import { connectToChat, getChatStatus } from '../services/twitchChat.js';

const router = express.Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function renderHtmlWithPartials(entryFilePath, partialsRootDir) {
  const visited = new Set();

  const renderFile = (filePath) => {
    const abs = path.resolve(filePath);
    if (visited.has(abs)) {
      throw new Error(`Circular partial include detected: ${abs}`);
    }
    visited.add(abs);

    let html = fs.readFileSync(abs, 'utf8');

    // Syntax: {{> chrome/sidebar}} -> <partialsRootDir>/chrome/sidebar.html
    html = html.replace(/\{\{>\s*([a-zA-Z0-9/_-]+)\s*\}\}/g, (_match, partialName) => {
      const partialPath = path.join(partialsRootDir, `${partialName}.html`);
      return renderFile(partialPath);
    });

    visited.delete(abs);
    return html;
  };

  return renderFile(entryFilePath);
}

router.get('/', requireAuth, async (req, res) => {
  try {
    // Auto-connect to chat if not already connected
    const twitchUserId = req.session.userId;
    const username = req.session.username;
    const accessToken = req.session.accessToken;
    
    if (twitchUserId && username) {
      const chatStatus = getChatStatus(twitchUserId);
      if (!chatStatus || !chatStatus.connected) {
        console.log(`[Dashboard] Auto-connecting chat for user ${twitchUserId}`);
        connectToChat(twitchUserId, username, accessToken)
          .then(() => {
            console.log(`[Dashboard] Chat auto-connected successfully for user ${twitchUserId}`);
          })
          .catch((error) => {
            console.error(`[Dashboard] Failed to auto-connect chat for user ${twitchUserId}:`, error.message);
            // Don't block dashboard load - chat connection will retry
          });
      } else {
        console.log(`[Dashboard] Chat already connected for user ${twitchUserId}`);
      }
    }
    
    // Render dashboard template (supports partial includes)
    const templatePath = path.join(__dirname, '../views/dashboard/template.html');
    const partialsRoot = path.join(__dirname, '../views/dashboard/partials');
    let dashboardHtml = renderHtmlWithPartials(templatePath, partialsRoot);
    
    // Replace user info placeholders
    const displayName = req.session.displayName || req.session.username || 'User';
    const twitchUsername = req.session.username || '';
    const userId = req.session.userId || '';
    const profileImageUrl = req.session.profileImageUrl || '';
    const userInitial = displayName && displayName.length > 0 ? displayName.charAt(0).toUpperCase() : 'U';
    
    // Debug logging
    console.log('[Dashboard] User info:', { 
      displayName, 
      twitchUsername, 
      userId, 
      profileImageUrl: profileImageUrl ? 'present' : 'missing',
      userInitial 
    });
    
    dashboardHtml = dashboardHtml.replace(/\{\{USERNAME\}\}/g, displayName);
    dashboardHtml = dashboardHtml.replace(/\{\{TWITCH_USERNAME\}\}/g, twitchUsername);
    dashboardHtml = dashboardHtml.replace(/\{\{USER_ID\}\}/g, userId);
    dashboardHtml = dashboardHtml.replace(/\{\{PROFILE_IMAGE_URL\}\}/g, profileImageUrl || '');
    dashboardHtml = dashboardHtml.replace(/\{\{USER_INITIAL\}\}/g, userInitial);
    
    res.send(dashboardHtml);
  } catch (error) {
    console.error('Error loading dashboard:', error);
    res.status(500).send('Error loading dashboard');
  }
});

export default router;

