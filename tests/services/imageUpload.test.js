import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { upload, getImageDimensions, deleteImageFile } from '../../services/imageUpload.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Mock fs - need to create mock functions that can be accessed
const mockExistsSync = jest.fn();
const mockUnlinkSync = jest.fn();

jest.mock('fs', () => {
  const actualFs = jest.requireActual('fs');
  return {
    ...actualFs,
    existsSync: mockExistsSync,
    unlinkSync: mockUnlinkSync
  };
});

describe('Image Upload Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockExistsSync.mockClear();
    mockUnlinkSync.mockClear();
  });

  describe('upload (multer configuration)', () => {
    it('should be configured with correct file size limit', () => {
      expect(upload.limits.fileSize).toBe(600 * 1024); // 600KB
    });

    it('should accept valid image files', () => {
      const file = {
        originalname: 'test.jpg',
        mimetype: 'image/jpeg'
      };
      
      const cb = jest.fn();
      upload.fileFilter(null, file, cb);
      
      expect(cb).toHaveBeenCalledWith(null, true);
    });

    it('should reject invalid file types', () => {
      const file = {
        originalname: 'test.txt',
        mimetype: 'text/plain'
      };
      
      const cb = jest.fn();
      upload.fileFilter(null, file, cb);
      
      expect(cb).toHaveBeenCalledWith(
        expect.objectContaining({ message: expect.stringContaining('Only image files') }),
        false
      );
    });

    it('should accept various image formats', () => {
      const formats = [
        { originalname: 'test.jpg', mimetype: 'image/jpeg' },
        { originalname: 'test.png', mimetype: 'image/png' },
        { originalname: 'test.gif', mimetype: 'image/gif' },
        { originalname: 'test.webp', mimetype: 'image/webp' }
      ];

      formats.forEach(file => {
        const cb = jest.fn();
        upload.fileFilter(null, file, cb);
        expect(cb).toHaveBeenCalledWith(null, true);
      });
    });
  });

  describe('getImageDimensions', () => {
    it('should return null dimensions', async () => {
      const result = await getImageDimensions('/uploads/test.jpg');
      
      expect(result).toEqual({ width: null, height: null });
    });
  });

  describe('deleteImageFile', () => {
    it('should delete file if it exists and path is valid', () => {
      const filePath = '/uploads/images/test.jpg';
      const fullPath = path.join(__dirname, '../public', filePath);
      
      mockExistsSync.mockReturnValue(true);
      
      const result = deleteImageFile(filePath);
      
      expect(mockExistsSync).toHaveBeenCalled();
      expect(mockUnlinkSync).toHaveBeenCalledWith(expect.stringContaining('test.jpg'));
      expect(result).toBe(true);
    });

    it('should return false if file does not exist', () => {
      const filePath = '/uploads/images/nonexistent.jpg';
      
      mockExistsSync.mockReturnValue(false);
      
      const result = deleteImageFile(filePath);
      
      expect(mockExistsSync).toHaveBeenCalled();
      expect(mockUnlinkSync).not.toHaveBeenCalled();
      expect(result).toBe(false);
    });

    it('should throw error for invalid file path', () => {
      const filePath = '../../../etc/passwd';
      
      const result = deleteImageFile(filePath);
      
      expect(result).toBe(false);
      expect(mockUnlinkSync).not.toHaveBeenCalled();
    });

    it('should return false on error', () => {
      const filePath = '/uploads/images/test.jpg';
      
      mockExistsSync.mockReturnValue(true);
      mockUnlinkSync.mockImplementation(() => {
        throw new Error('Permission denied');
      });
      
      const result = deleteImageFile(filePath);
      
      expect(result).toBe(false);
    });
  });
});

