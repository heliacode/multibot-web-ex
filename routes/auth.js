import express from 'express';
import { initiateAuth, handleCallback, logout } from '../controllers/authController.js';

const router = express.Router();

router.get('/twitch', initiateAuth);
router.get('/twitch/callback', handleCallback);
router.get('/logout', logout);

export default router;

