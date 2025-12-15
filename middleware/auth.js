export function requireAuth(req, res, next) {
  if (req.session && req.session.userId) {
    return next();
  }
  
  // For API routes, return JSON error instead of redirect
  // Use originalUrl to check the full path including mount point
  const path = req.originalUrl || req.url || req.path;
  if (path.startsWith('/api/')) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  
  // For regular routes, redirect to home
  res.redirect('/');
}

export function optionalAuth(req, res, next) {
  // This middleware doesn't block, just adds user info if available
  if (req.session && req.session.userId) {
    req.user = {
      id: req.session.userId,
      username: req.session.username,
      displayName: req.session.displayName,
      profileImageUrl: req.session.profileImageUrl
    };
  }
  next();
}

