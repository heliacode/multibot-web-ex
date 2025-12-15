import { jest, describe, it, expect, beforeEach } from '@jest/globals';

// Mock database before importing the model
const mockQuery = jest.fn();
jest.mock('../../config/database.js', () => ({
  query: mockQuery,
  default: { query: mockQuery }
}));

import * as userImageModel from '../../models/userImage.js';

describe('UserImage Model', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset mock implementation
    mockQuery.mockClear();
  });

  describe('createUserImage', () => {
    it('should create a new user image', async () => {
      const imageData = {
        userId: 1,
        twitchUserId: 'twitch123',
        filePath: '/uploads/images/test.jpg',
        fileName: 'test.jpg',
        fileSize: 1000,
        mimeType: 'image/jpeg',
        width: 100,
        height: 100
      };

      const mockResult = {
        rows: [{
          id: 1,
          ...imageData,
          created_at: new Date()
        }]
      };

      mockQuery.mockResolvedValue(mockResult);

      const result = await userImageModel.createUserImage(imageData);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO user_images'),
        expect.arrayContaining([
          imageData.userId,
          imageData.twitchUserId,
          imageData.filePath,
          imageData.fileName,
          imageData.fileSize,
          imageData.mimeType,
          imageData.width,
          imageData.height
        ])
      );
      expect(result).toEqual(mockResult.rows[0]);
    });
  });

  describe('getUserImagesByUserId', () => {
    it('should get all images for a user', async () => {
      const userId = 1;
      const mockResult = {
        rows: [
          { id: 1, file_path: '/uploads/image1.jpg' },
          { id: 2, file_path: '/uploads/image2.jpg' }
        ]
      };

      mockQuery.mockResolvedValue(mockResult);

      const result = await userImageModel.getUserImagesByUserId(userId);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('SELECT * FROM user_images'),
        [userId]
      );
      expect(result).toEqual(mockResult.rows);
    });
  });

  describe('getUserImagesByTwitchId', () => {
    it('should get all images for a user by Twitch ID', async () => {
      const twitchUserId = 'twitch123';
      const mockResult = {
        rows: [
          { id: 1, file_path: '/uploads/image1.jpg' }
        ]
      };

      mockQuery.mockResolvedValue(mockResult);

      const result = await userImageModel.getUserImagesByTwitchId(twitchUserId);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('SELECT * FROM user_images'),
        [twitchUserId]
      );
      expect(result).toEqual(mockResult.rows);
    });
  });

  describe('getUserImageById', () => {
    it('should get a single image by ID', async () => {
      const imageId = 1;
      const userId = 1;
      const mockResult = {
        rows: [{
          id: imageId,
          user_id: userId,
          file_path: '/uploads/test.jpg'
        }]
      };

      mockQuery.mockResolvedValue(mockResult);

      const result = await userImageModel.getUserImageById(imageId, userId);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('SELECT * FROM user_images'),
        [imageId, userId]
      );
      expect(result).toEqual(mockResult.rows[0]);
    });

    it('should return undefined if image not found', async () => {
      const imageId = 999;
      const userId = 1;
      const mockResult = { rows: [] };

      mockQuery.mockResolvedValue(mockResult);

      const result = await userImageModel.getUserImageById(imageId, userId);

      expect(result).toBeUndefined();
    });
  });

  describe('deleteUserImage', () => {
    it('should delete an image', async () => {
      const imageId = 1;
      const userId = 1;
      const mockResult = {
        rows: [{
          id: imageId,
          user_id: userId,
          file_path: '/uploads/test.jpg'
        }]
      };

      mockQuery.mockResolvedValue(mockResult);

      const result = await userImageModel.deleteUserImage(imageId, userId);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM user_images'),
        [imageId, userId]
      );
      expect(result).toEqual(mockResult.rows[0]);
    });
  });
});

