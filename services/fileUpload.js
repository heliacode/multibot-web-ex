import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import axios from 'axios';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '../public/uploads/audio');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    // Generate unique filename: timestamp-random-originalname
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, `audio-${uniqueSuffix}${ext}`);
  }
});

// File filter - only allow audio files
const fileFilter = (req, file, cb) => {
  const allowedMimes = ['audio/mpeg', 'audio/mp3', 'audio/mpeg3', 'audio/x-mpeg-3'];
  const allowedExts = ['.mp3'];
  const ext = path.extname(file.originalname).toLowerCase();

  if (allowedExts.includes(ext) || allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only MP3 files are allowed'), false);
  }
};

// Configure multer
export const upload = multer({
  storage: storage,
  limits: {
    fileSize: 500 * 1024, // 500KB max
  },
  fileFilter: fileFilter
});

/**
 * Download audio file from URL
 */
export async function downloadAudioFromUrl(url, userId) {
  try {
    // Validate URL
    if (!url || !url.startsWith('http')) {
      throw new Error('Invalid URL');
    }

    // Download the file
    const response = await axios({
      url: url,
      method: 'GET',
      responseType: 'stream',
      timeout: 30000, // 30 second timeout
      maxContentLength: 500 * 1024, // 500KB max
    });

    // Check content type
    const contentType = response.headers['content-type'];
    if (!contentType || !contentType.includes('audio')) {
      throw new Error('URL does not point to an audio file');
    }

    // Generate filename
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const filename = `audio-${uniqueSuffix}.mp3`;
    const filePath = path.join(uploadsDir, filename);

    // Save file
    const writer = fs.createWriteStream(filePath);
    response.data.pipe(writer);

    return new Promise((resolve, reject) => {
      writer.on('finish', () => {
        const stats = fs.statSync(filePath);
        if (stats.size > 500 * 1024) {
          fs.unlinkSync(filePath);
          reject(new Error('File size exceeds 500KB limit'));
          return;
        }
        resolve({
          filePath: `/uploads/audio/${filename}`,
          fileSize: stats.size
        });
      });
      writer.on('error', (error) => {
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
        reject(error);
      });
    });
  } catch (error) {
    if (error.response) {
      throw new Error(`Failed to download file: ${error.response.statusText}`);
    }
    throw error;
  }
}

/**
 * Delete audio file
 */
export function deleteAudioFile(filePath) {
  try {
    // Only delete files in the uploads directory for security
    const fullPath = path.join(__dirname, '../public', filePath);
    const normalizedPath = path.normalize(fullPath);
    const uploadsBasePath = path.normalize(path.join(__dirname, '../public/uploads/audio'));

    if (!normalizedPath.startsWith(uploadsBasePath)) {
      throw new Error('Invalid file path');
    }

    if (fs.existsSync(normalizedPath)) {
      fs.unlinkSync(normalizedPath);
      return true;
    }
    return false;
  } catch (error) {
    console.error('Error deleting audio file:', error);
    return false;
  }
}

