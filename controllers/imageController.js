import { createUserImage, getUserImagesByTwitchId, getUserImageById, deleteUserImage } from '../models/userImage.js';
import { getUserByTwitchId } from '../models/user.js';
import { getImageDimensions, deleteImageFile } from '../services/imageUpload.js';
import path from 'path';

async function getUserIdFromTwitchId(twitchUserId) {
  try {
    const user = await getUserByTwitchId(twitchUserId);
    return user ? user.id : null;
  } catch (error) {
    return null;
  }
}

/**
 * Upload a new image
 */
export async function uploadImage(req, res) {
  try {
    const twitchUserId = req.session.userId;
    
    if (!twitchUserId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const userId = await getUserIdFromTwitchId(twitchUserId);
    if (!userId) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Get image dimensions
    const dimensions = await getImageDimensions(req.file.path);

    // Create image record
    const image = await createUserImage({
      userId,
      twitchUserId,
      filePath: `/uploads/images/${path.basename(req.file.path)}`,
      fileName: req.file.originalname,
      fileSize: req.file.size,
      mimeType: req.file.mimetype,
      width: dimensions.width,
      height: dimensions.height
    });

    res.status(201).json({
      success: true,
      image
    });
  } catch (error) {
    console.error('Error uploading image:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({
      error: 'Failed to upload image',
      message: error.message || 'Unknown error occurred'
    });
  }
}

/**
 * Get all images for the current user
 */
export async function getImages(req, res) {
  try {
    const twitchUserId = req.session.userId;
    
    if (!twitchUserId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const images = await getUserImagesByTwitchId(twitchUserId);

    res.json({
      success: true,
      images
    });
  } catch (error) {
    console.error('Error getting images:', error);
    res.status(500).json({
      error: 'Failed to get images',
      message: error.message
    });
  }
}

/**
 * Delete an image
 */
export async function deleteImage(req, res) {
  try {
    const twitchUserId = req.session.userId;
    
    if (!twitchUserId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const userId = await getUserIdFromTwitchId(twitchUserId);
    if (!userId) {
      return res.status(404).json({ error: 'User not found' });
    }

    const imageId = parseInt(req.params.id);
    const image = await getUserImageById(imageId, userId);

    if (!image) {
      return res.status(404).json({ error: 'Image not found' });
    }

    // Delete file from filesystem
    deleteImageFile(image.file_path);

    // Delete from database
    await deleteUserImage(imageId, userId);

    res.json({
      success: true,
      message: 'Image deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting image:', error);
    res.status(500).json({
      error: 'Failed to delete image',
      message: error.message
    });
  }
}

