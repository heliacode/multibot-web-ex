import express from 'express';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

router.get('/', requireAuth, (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>MultiBot Dashboard</title>
      <script src="https://cdn.tailwindcss.com"></script>
      <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css" />
    </head>
    <body class="bg-gradient-to-br from-cyan-500 to-blue-600 min-h-screen flex items-center justify-center">
      <div class="bg-white/10 backdrop-blur-lg rounded-3xl p-8 shadow-2xl">
        <h1 class="text-4xl font-bold text-white mb-4">Welcome, ${req.session.displayName || req.session.username}!</h1>
        <p class="text-white/90 mb-6">You are successfully authenticated.</p>
        <a href="/auth/logout" class="bg-white text-cyan-600 px-6 py-3 rounded-xl font-semibold hover:bg-cyan-50 transition">
          Logout
        </a>
      </div>
    </body>
    </html>
  `);
});

export default router;

