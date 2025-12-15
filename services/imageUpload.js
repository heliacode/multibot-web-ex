import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '../public/uploads/images');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer for image uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    // Generate unique filename: timestamp-random-originalname
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, `image-${uniqueSuffix}${ext}`);
  }
});

// File filter - only allow image files
const fileFilter = (req, file, cb) => {
  const allowedMimes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
  const allowedExts = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
  const ext = path.extname(file.originalname).toLowerCase();

  if (allowedExts.includes(ext) || allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only image files (JPEG, PNG, GIF, WebP) are allowed'), false);
  }
};

// Configure multer
export const upload = multer({
  storage: storage,
  limits: {
    fileSize: 600 * 1024, // 600KB max
  },
  fileFilter: fileFilter
});

/**
 * Get image dimensions (optional - can be set from frontend)
 * For now, return null - dimensions can be set when image is added to canvas
 */
export async function getImageDimensions(filePath) {
  // Dimensions will be determined on the frontend when image is loaded
  // This keeps the backend simpler and doesn't require image processing libraries
  return { width: null, height: null };
}

/**
 * Delete image file
 */
export function deleteImageFile(filePath) {
  try {
    // Only delete files in the uploads directory for security
    const fullPath = path.join(__dirname, '../public', filePath);
    const normalizedPath = path.normalize(fullPath);
    const uploadsBasePath = path.normalize(path.join(__dirname, '../public/uploads/images'));

    if (!normalizedPath.startsWith(uploadsBasePath)) {
      throw new Error('Invalid file path');
    }

    if (fs.existsSync(normalizedPath)) {
      fs.unlinkSync(normalizedPath);
      return true;
    }
    return false;
  } catch (error) {
    console.error('Error deleting image file:', error);
    return false;
  }
}

