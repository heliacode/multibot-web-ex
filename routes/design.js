import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import { saveDesign, getDesign } from '../controllers/designController.js';

const router = express.Router();

// Get design elements
router.get('/', requireAuth, getDesign);

// Save design elements
router.post('/', requireAuth, saveDesign);

export default router;

