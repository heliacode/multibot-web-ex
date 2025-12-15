import express from 'express';
import { initiateAuth, handleCallback, logout, createUserFromSession } from '../controllers/authController.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

router.get('/twitch', initiateAuth);
router.get('/twitch/callback', handleCallback);
router.get('/logout', logout);
router.post('/create-user', requireAuth, createUserFromSession);

export default router;

