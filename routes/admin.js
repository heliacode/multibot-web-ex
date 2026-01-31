import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import {
  getCronjobs,
  getCronjob,
  createCronjobHandler,
  updateCronjobHandler,
  deleteCronjobHandler
} from '../controllers/adminController.js';

const router = express.Router();

// All admin routes require authentication
router.use(requireAuth);

// Cronjob routes
router.get('/cronjobs', getCronjobs);
router.get('/cronjobs/:id', getCronjob);
router.post('/cronjobs', createCronjobHandler);
router.put('/cronjobs/:id', updateCronjobHandler);
router.delete('/cronjobs/:id', deleteCronjobHandler);

export default router;
