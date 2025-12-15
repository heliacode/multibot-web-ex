import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

router.get('/', requireAuth, async (req, res) => {
  try {
    // Read the dashboard HTML file and replace placeholders
    const fs = await import('fs');
    let dashboardHtml = fs.readFileSync(
      path.join(__dirname, '../public/dashboard.html'),
      'utf8'
    );
    
    // Replace user info placeholders
    const username = req.session.displayName || req.session.username || 'User';
    const twitchUsername = req.session.username || '';
    const userId = req.session.userId || '';
    const profileImageUrl = req.session.profileImageUrl || '';
    const userInitial = username.charAt(0).toUpperCase();
    
    dashboardHtml = dashboardHtml.replace(/\{\{USERNAME\}\}/g, username);
    dashboardHtml = dashboardHtml.replace(/\{\{TWITCH_USERNAME\}\}/g, twitchUsername);
    dashboardHtml = dashboardHtml.replace(/\{\{USER_ID\}\}/g, userId);
    dashboardHtml = dashboardHtml.replace(/\{\{PROFILE_IMAGE_URL\}\}/g, profileImageUrl);
    dashboardHtml = dashboardHtml.replace(/\{\{USER_INITIAL\}\}/g, userInitial);
    
    res.send(dashboardHtml);
  } catch (error) {
    console.error('Error loading dashboard:', error);
    res.status(500).send('Error loading dashboard');
  }
});

export default router;

