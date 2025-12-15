import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import { uploadImage, getImages, deleteImage } from '../controllers/imageController.js';
import { upload } from '../services/imageUpload.js';

const router = express.Router();

// Get all images for the current user
router.get('/', requireAuth, getImages);

// Upload a new image
router.post('/', requireAuth, upload.single('imageFile'), uploadImage);

// Delete an image
router.delete('/:id', requireAuth, deleteImage);

export default router;

