import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import { startChat, stopChat, getStatus } from '../controllers/chatController.js';

const router = express.Router();

router.post('/start', requireAuth, startChat);
router.post('/stop', requireAuth, stopChat);
router.get('/status', requireAuth, getStatus);

export default router;

