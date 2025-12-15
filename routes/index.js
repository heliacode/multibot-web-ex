import express from 'express';
import { optionalAuth } from '../middleware/auth.js';
import path from 'path';
import { fileURLToPath } from 'url';

const router = express.Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

router.get('/', optionalAuth, (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

export default router;

