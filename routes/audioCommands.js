import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import {
  createCommand,
  getCommands,
  getCommand,
  updateCommand,
  deleteCommand
} from '../controllers/audioCommandController.js';
import { upload } from '../services/fileUpload.js';

const router = express.Router();

// Get all audio commands
router.get('/', requireAuth, getCommands);

// Get a single audio command
router.get('/:id', requireAuth, getCommand);

// Create a new audio command (with optional file upload)
router.post('/', requireAuth, upload.single('audioFile'), createCommand);

// Update an audio command (with optional file upload)
router.put('/:id', requireAuth, upload.single('audioFile'), updateCommand);

// Delete an audio command
router.delete('/:id', requireAuth, deleteCommand);

export default router;

