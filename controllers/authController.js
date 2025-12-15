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
      const userMessage = error === 'access_denied' 
        ? 'You cancelled the authorization. Please try again if you want to connect.'
        : 'Authentication was cancelled or incomplete. Please try again.';
      return res.redirect('/?error=' + encodeURIComponent(userMessage));
    }

    // Verify state parameter
    if (!state || state !== req.session.oauthState) {
      return res.redirect('/?error=' + encodeURIComponent('Security verification failed. Please try again.'));
    }

    // Check for authorization code
    if (!code) {
      return res.redirect('/?error=' + encodeURIComponent('Authorization was cancelled or incomplete. Please try again.'));
    }

    // Handle OAuth callback
    const userData = await handleOAuthCallback(code);

    // Store user in session
    req.session.userId = userData.twitchUserId;
    req.session.username = userData.username;
    req.session.displayName = userData.displayName;
    req.session.profileImageUrl = userData.profileImageUrl;
    req.session.accessToken = userData.accessToken; // Store access token for chat connection
    req.session.refreshToken = userData.refreshToken;

    // Clear OAuth state
    delete req.session.oauthState;

    // Redirect to dashboard or home
    res.redirect('/dashboard');
  } catch (error) {
    console.error('OAuth callback error:', error);
    console.error('Error stack:', error.stack);
    
    // Map technical errors to user-friendly messages
    let userMessage = 'Authentication failed. Please try again.';
    
    if (error.message.includes('Client Secret is not configured')) {
      userMessage = 'Authentication configuration error. Please contact support.';
    } else if (error.message.includes('Failed to exchange')) {
      userMessage = 'Unable to complete authentication. Please try again.';
    } else if (error.message.includes('Failed to fetch user information')) {
      userMessage = 'Unable to retrieve your Twitch account information. Please try again.';
    } else if (error.message.includes('Database error')) {
      userMessage = 'Unable to save your account information. Please try again.';
    }
    
    res.redirect('/?error=' + encodeURIComponent(userMessage));
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

