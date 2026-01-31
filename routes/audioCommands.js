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

// Error handler for multer errors
const handleMulterError = (err, req, res, next) => {
  if (err) {
    console.error('[AUDIO CMD ROUTE] Multer error:', err.message);
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'File size exceeds 500KB limit' });
    }
    if (err.message && err.message.includes('Only MP3')) {
      return res.status(400).json({ error: err.message });
    }
    return res.status(400).json({ error: 'File upload error', message: err.message });
  }
  next();
};

// Get all audio commands
router.get('/', requireAuth, getCommands);

// Get a single audio command
router.get('/:id', requireAuth, getCommand);

// Create a new audio command (with optional file upload)
// Note: multer expects 'audioFile' field name
router.post('/', requireAuth, upload.single('audioFile'), handleMulterError, createCommand);

// Update an audio command (with optional file upload)
// Note: multer expects 'audioFile' field name, but we also support updates without files
router.put('/:id', requireAuth, upload.single('audioFile'), handleMulterError, updateCommand);

// Delete an audio command
router.delete('/:id', requireAuth, deleteCommand);

export default router;

