import { generateAuthUrl, handleOAuthCallback, generateState } from '../services/twitchAuth.js';

export function initiateAuth(req, res) {
  const state = generateState();
  req.session.oauthState = state;
  
  const authUrl = generateAuthUrl(state);
  res.redirect(authUrl);
}

export async function handleCallback(req, res) {
  try {
    const { code, state, error } = req.query;

    // Check for OAuth errors
    if (error) {
      return res.redirect('/?error=' + encodeURIComponent(error));
    }

    // Verify state parameter
    if (!state || state !== req.session.oauthState) {
      return res.redirect('/?error=' + encodeURIComponent('Invalid state parameter'));
    }

    // Check for authorization code
    if (!code) {
      return res.redirect('/?error=' + encodeURIComponent('No authorization code provided'));
    }

    // Handle OAuth callback
    const userData = await handleOAuthCallback(code);

    // Store user in session
    req.session.userId = userData.twitchUserId;
    req.session.username = userData.username;
    req.session.displayName = userData.displayName;
    req.session.profileImageUrl = userData.profileImageUrl;

    // Clear OAuth state
    delete req.session.oauthState;

    // Redirect to dashboard or home
    res.redirect('/dashboard');
  } catch (error) {
    console.error('OAuth callback error:', error);
    console.error('Error stack:', error.stack);
    const errorMessage = error.message || 'Authentication failed';
    res.redirect('/?error=' + encodeURIComponent(errorMessage));
  }
}

export function logout(req, res) {
  req.session.destroy((err) => {
    if (err) {
      console.error('Session destroy error:', err);
      return res.redirect('/?error=' + encodeURIComponent('Logout failed'));
    }
    res.redirect('/');
  });
}

