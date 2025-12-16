import express from 'express';
import {
  createCommand,
  getCommands,
  getCommand,
  updateCommand,
  deleteCommand
} from '../controllers/gifController.js';
import { requireAuth } from '../middleware/auth.js';
import { searchGifs, getTrendingGifs, getRandomGif, getGifById } from '../services/giphy.js';

const router = express.Router();

// All routes require authentication
router.use(requireAuth);

// GIF command CRUD routes
router.post('/', createCommand);
router.get('/', getCommands);
router.put('/:id', updateCommand);
router.delete('/:id', deleteCommand);

// Giphy API proxy routes (to avoid CORS and hide API key)
// These must come before the /:id route to avoid conflicts
router.get('/giphy/search', async (req, res) => {
  try {
    const { q, limit = 25, rating = 'g' } = req.query;
    
    if (!q) {
      return res.status(400).json({ error: 'Search query is required' });
    }

    const results = await searchGifs(q, parseInt(limit), rating);
    res.json({ success: true, gifs: results });
  } catch (error) {
    console.error('Error searching Giphy:', error);
    res.status(500).json({
      error: 'Failed to search Giphy',
      message: error.message
    });
  }
});

router.get('/giphy/trending', async (req, res) => {
  try {
    const { limit = 25, rating = 'g' } = req.query;
    const results = await getTrendingGifs(parseInt(limit), rating);
    res.json({ success: true, gifs: results });
  } catch (error) {
    console.error('Error getting trending GIFs:', error);
    res.status(500).json({
      error: 'Failed to get trending GIFs',
      message: error.message
    });
  }
});

router.get('/giphy/random', async (req, res) => {
  try {
    const { tag = '', rating = 'g' } = req.query;
    const gif = await getRandomGif(tag, rating);
    
    if (!gif) {
      return res.status(404).json({ error: 'No GIF found' });
    }
    
    res.json({ success: true, gif });
  } catch (error) {
    console.error('Error getting random GIF:', error);
    res.status(500).json({
      error: 'Failed to get random GIF',
      message: error.message
    });
  }
});

router.get('/giphy/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const gif = await getGifById(id);
    
    if (!gif) {
      return res.status(404).json({ error: 'GIF not found' });
    }
    
    res.json({ success: true, gif });
  } catch (error) {
    console.error('Error getting GIF by ID:', error);
    res.status(500).json({
      error: 'Failed to get GIF',
      message: error.message
    });
  }
});

// Get a single GIF command by ID (must come after giphy routes)
router.get('/:id', getCommand);

export default router;

