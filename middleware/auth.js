export function requireAuth(req, res, next) {
  if (req.session && req.session.userId) {
    return next();
  }
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

