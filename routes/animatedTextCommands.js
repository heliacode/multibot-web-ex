import express from 'express';
import {
  createCommand,
  getCommands,
  getCommand,
  updateCommand,
  deleteCommand
} from '../controllers/animatedTextController.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

// All routes require authentication
router.use(requireAuth);

// Animated text command CRUD routes
router.post('/', createCommand);
router.get('/', getCommands);
router.get('/:id', getCommand);
router.put('/:id', updateCommand);
router.delete('/:id', deleteCommand);

export default router;
