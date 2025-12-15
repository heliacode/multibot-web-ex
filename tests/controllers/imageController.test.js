import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { uploadImage, getImages, deleteImage } from '../../controllers/imageController.js';
import * as userImageModel from '../../models/userImage.js';
import * as userModel from '../../models/user.js';
import * as imageUploadService from '../../services/imageUpload.js';

// Mock path module
jest.mock('path', () => ({
  basename: jest.fn((path) => path.split('/').pop())
}));

// Mock dependencies
jest.mock('../../models/userImage.js');
jest.mock('../../models/user.js');
jest.mock('../../services/imageUpload.js');

describe('Image Controller', () => {
  let req, res;

  beforeEach(() => {
    jest.clearAllMocks();
    
    req = {
      session: {},
      params: {},
      file: null
    };
    
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
  });

  describe('uploadImage', () => {
    it('should return 401 if not authenticated', async () => {
      req.session.userId = null;

      await uploadImage(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ error: 'Not authenticated' });
    });

    it('should return 400 if no file uploaded', async () => {
      req.session.userId = 'twitch123';
      req.file = null;

      await uploadImage(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'No file uploaded' });
    });

    it('should return 404 if user not found', async () => {
      req.session.userId = 'twitch123';
      req.file = { path: '/uploads/test.jpg', originalname: 'test.jpg', size: 1000 };
      userModel.getUserByTwitchId.mockResolvedValue(null);

      await uploadImage(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'User not found' });
    });

    it('should successfully upload image', async () => {
      req.session.userId = 'twitch123';
      req.file = { 
        path: '/uploads/images/image-123.jpg', 
        originalname: 'test.jpg', 
        size: 1000,
        mimetype: 'image/jpeg'
      };
      
      const mockUser = { id: 1 };
      const mockImage = { id: 1, file_path: '/uploads/images/image-123.jpg' };
      
      userModel.getUserByTwitchId.mockResolvedValue(mockUser);
      imageUploadService.getImageDimensions.mockResolvedValue({ width: 100, height: 100 });
      userImageModel.createUserImage.mockResolvedValue(mockImage);

      await uploadImage(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        image: mockImage
      });
      expect(userImageModel.createUserImage).toHaveBeenCalled();
    });

    it('should handle errors during upload', async () => {
      req.session.userId = 'twitch123';
      req.file = { path: '/uploads/test.jpg', originalname: 'test.jpg', size: 1000 };
      userModel.getUserByTwitchId.mockRejectedValue(new Error('Database error'));

      await uploadImage(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Failed to upload image',
        message: 'Database error'
      });
    });
  });

  describe('getImages', () => {
    it('should return 401 if not authenticated', async () => {
      req.session.userId = null;

      await getImages(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ error: 'Not authenticated' });
    });

    it('should return all images for user', async () => {
      req.session.userId = 'twitch123';
      const mockImages = [
        { id: 1, file_path: '/uploads/image1.jpg' },
        { id: 2, file_path: '/uploads/image2.jpg' }
      ];
      
      userImageModel.getUserImagesByTwitchId.mockResolvedValue(mockImages);

      await getImages(req, res);

      expect(res.json).toHaveBeenCalledWith({
        success: true,
        images: mockImages
      });
    });

    it('should handle errors when getting images', async () => {
      req.session.userId = 'twitch123';
      userImageModel.getUserImagesByTwitchId.mockRejectedValue(new Error('Database error'));

      await getImages(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Failed to get images',
        message: 'Database error'
      });
    });
  });

  describe('deleteImage', () => {
    it('should return 401 if not authenticated', async () => {
      req.session.userId = null;

      await deleteImage(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ error: 'Not authenticated' });
    });

    it('should return 404 if user not found', async () => {
      req.session.userId = 'twitch123';
      req.params.id = '1';
      userModel.getUserByTwitchId.mockResolvedValue(null);

      await deleteImage(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'User not found' });
    });

    it('should return 404 if image not found', async () => {
      req.session.userId = 'twitch123';
      req.params.id = '1';
      const mockUser = { id: 1 };
      
      userModel.getUserByTwitchId.mockResolvedValue(mockUser);
      userImageModel.getUserImageById.mockResolvedValue(null);

      await deleteImage(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'Image not found' });
    });

    it('should successfully delete image', async () => {
      req.session.userId = 'twitch123';
      req.params.id = '1';
      const mockUser = { id: 1 };
      const mockImage = { id: 1, file_path: '/uploads/images/test.jpg' };
      
      userModel.getUserByTwitchId.mockResolvedValue(mockUser);
      userImageModel.getUserImageById.mockResolvedValue(mockImage);
      userImageModel.deleteUserImage.mockResolvedValue(mockImage);
      imageUploadService.deleteImageFile.mockReturnValue(true);

      await deleteImage(req, res);

      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Image deleted successfully'
      });
      expect(imageUploadService.deleteImageFile).toHaveBeenCalledWith(mockImage.file_path);
      expect(userImageModel.deleteUserImage).toHaveBeenCalledWith(1, 1);
    });

    it('should handle errors during deletion', async () => {
      req.session.userId = 'twitch123';
      req.params.id = '1';
      userModel.getUserByTwitchId.mockRejectedValue(new Error('Database error'));

      await deleteImage(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Failed to delete image',
        message: 'Database error'
      });
    });
  });
});

