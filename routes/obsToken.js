import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import {
  getToken,
  regenerateToken,
  validateToken
} from '../controllers/obsTokenController.js';

const router = express.Router();

// Get or create OBS token (requires authentication)
router.get('/', requireAuth, getToken);

// Regenerate OBS token (requires authentication)
router.post('/regenerate', requireAuth, regenerateToken);

// Validate token (public endpoint - token is the authentication)
router.get('/validate', validateToken);

export default router;

