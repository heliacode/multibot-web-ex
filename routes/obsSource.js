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
    const { token } = req.query;
    
    if (!token) {
      return res.status(400).send(`
        <html>
          <head><title>OBS Browser Source - Error</title></head>
          <body style="font-family: Arial; text-align: center; padding: 50px; background: #1a1a1a; color: white;">
            <h1>Missing Token</h1>
            <p>Please provide a token in the URL: /obs-source?token=YOUR_TOKEN</p>
            <p>Get your token from the MultiBot dashboard.</p>
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
    
    res.send(obsHtml);
  } catch (error) {
    console.error('Error loading OBS source:', error);
    res.status(500).send('Error loading OBS browser source');
  }
});

export default router;

