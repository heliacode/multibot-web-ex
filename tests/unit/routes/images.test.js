import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import request from 'supertest';
import express from 'express';
import imagesRoutes from '../../routes/images.js';
import * as imageController from '../../controllers/imageController.js';
import { requireAuth } from '../../middleware/auth.js';

// Mock dependencies
jest.mock('../../controllers/imageController.js');
jest.mock('../../middleware/auth.js', () => ({
  requireAuth: jest.fn((req, res, next) => {
    // Simulate authenticated user
    req.session = { userId: 'twitch123' };
    next();
  })
}));

const app = express();
app.use(express.json());
app.use('/api/images', imagesRoutes);

describe('Images Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/images', () => {
    it('should call getImages controller', async () => {
      imageController.getImages.mockImplementation((req, res) => {
        res.json({ success: true, images: [] });
      });

      await request(app)
        .get('/api/images')
        .expect(200)
        .expect('Content-Type', /json/);

      expect(imageController.getImages).toHaveBeenCalled();
    });
  });

  describe('POST /api/images', () => {
    it('should call uploadImage controller', async () => {
      imageController.uploadImage.mockImplementation((req, res) => {
        res.status(201).json({ success: true, image: { id: 1 } });
      });

      await request(app)
        .post('/api/images')
        .attach('imageFile', Buffer.from('fake image'), 'test.jpg')
        .expect(201);

      expect(imageController.uploadImage).toHaveBeenCalled();
    });
  });

  describe('DELETE /api/images/:id', () => {
    it('should call deleteImage controller', async () => {
      imageController.deleteImage.mockImplementation((req, res) => {
        res.json({ success: true, message: 'Image deleted' });
      });

      await request(app)
        .delete('/api/images/1')
        .expect(200);

      expect(imageController.deleteImage).toHaveBeenCalled();
    });
  });
});

