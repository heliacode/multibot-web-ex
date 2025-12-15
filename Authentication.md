# Twitch Authentication Guide

This document explains how to implement Twitch OAuth authentication for MultiBot Web.

## Overview

MultiBot Web uses Twitch OAuth 2.0 to authenticate streamers and grant the application access to their Twitch account. This allows the application to interact with Twitch chat, read channel information, and manage bot functionality on behalf of the authenticated user.

## Prerequisites

1. A Twitch Developer Account
2. A registered Twitch Application in the Developer Console
3. Node.js application with HTTPS support (required for OAuth callbacks)

## Step 1: Register Your Application

1. Go to [Twitch Developers Console](https://dev.twitch.tv/console)
2. Log in with your Twitch account
3. Click **"Register Your Application"**
4. Fill in the application details:
   - **Name**: MultiBot Web (or your preferred name)
   - **OAuth Redirect URLs**: 
     - Development: `http://localhost:3000/auth/twitch/callback`
     - Production: `https://your-domain.railway.app/auth/twitch/callback`
   - **Category**: Chat Bot or Website Integration
   - **Client Type**: **Web Application** (select this option)
   - **Public/Private**: **Public** (select this option)
5. Click **"Create"**
6. Save your **Client ID** and generate a **Client Secret**

**Notes:**
- Select **"Web Application"** as the client type since MultiBot Web is a web-based application running on Railway. This is the correct choice for Node.js backend applications that serve web frontends.
- Select **"Public"** as the application type. Public applications can be used by any Twitch user, which is necessary for MultiBot since multiple streamers will authenticate with your application. Private applications are only for internal use or testing with a limited set of users.

## Step 2: Required OAuth Scopes

**Important:** Scopes are **NOT** set in the Twitch Developer Console. Instead, they are requested dynamically when you redirect users to the authorization URL (see Step 3.1 below). The Developer Console does not have a place to configure scopes - you include them as a parameter in your authorization request URL.

The following scopes are required for MultiBot functionality:

| Scope | Purpose |
|-------|---------|
| `chat:read` | Read chat messages in channels |
| `chat:edit` | Send messages to chat |
| `channel:moderate` | Moderate chat (timeout, ban, etc.) |
| `bits:read` | Read bit donations and cheer events |
| `channel:read:redemptions` | Read channel point redemptions |
| `user:read:email` | Read user email (optional, for account management) |

**Full scope string for authorization URL:**
```
chat:read chat:edit channel:moderate bits:read channel:read:redemptions user:read:email
```

You will include these scopes in your code when building the authorization URL (see Step 3.1).

## Step 3: OAuth 2.0 Authorization Code Flow

### 3.1 Authorization Request

Redirect users to Twitch authorization URL:

```
https://id.twitch.tv/oauth2/authorize?
  client_id=YOUR_CLIENT_ID
  &redirect_uri=YOUR_REDIRECT_URI
  &response_type=code
  &scope=chat:read%20chat:edit%20channel:moderate%20bits:read%20channel:read:redemptions%20user:read:email
  &state=RANDOM_STATE_STRING
```

**Parameters:**
- `client_id`: Your Twitch application Client ID
- `redirect_uri`: Must match exactly one of your registered redirect URLs
- `response_type`: Always `code` for authorization code flow
- `scope`: Space-separated list of scopes (URL encoded)
- `state`: Random string to prevent CSRF attacks (store in session/cookie)

### 3.2 User Authorization

User will be redirected to Twitch login page where they:
1. Log in with their Twitch credentials
2. Review requested permissions
3. Click "Authorize" to grant access

### 3.3 Authorization Callback

After authorization, Twitch redirects to your callback URL with:
- `code`: Authorization code (single-use, expires in 10 minutes)
- `state`: The state parameter you sent (verify it matches)
- `scope`: Granted scopes (space-separated)

**Example callback:**
```
https://your-domain.railway.app/auth/twitch/callback?
  code=AUTHORIZATION_CODE
  &scope=chat:read%20chat:edit%20channel:moderate%20bits:read
  &state=RANDOM_STATE_STRING
```

### 3.4 Exchange Code for Tokens

Exchange the authorization code for access and refresh tokens:

**POST Request:**
```
POST https://id.twitch.tv/oauth2/token
Content-Type: application/x-www-form-urlencoded

client_id=YOUR_CLIENT_ID
&client_secret=YOUR_CLIENT_SECRET
&code=AUTHORIZATION_CODE
&grant_type=authorization_code
&redirect_uri=YOUR_REDIRECT_URI
```

**Response:**
```json
{
  "access_token": "ACCESS_TOKEN",
  "refresh_token": "REFRESH_TOKEN",
  "expires_in": 3600,
  "scope": ["chat:read", "chat:edit", "channel:moderate", "bits:read"],
  "token_type": "bearer"
}
```

### 3.5 Validate Token and Get User Info

Validate the access token and retrieve user information:

**GET Request:**
```
GET https://id.twitch.tv/oauth2/validate
Authorization: OAuth ACCESS_TOKEN
```

**Response:**
```json
{
  "client_id": "YOUR_CLIENT_ID",
  "login": "username",
  "scopes": ["chat:read", "chat:edit"],
  "user_id": "123456789",
  "expires_in": 3600
}
```

**Get User Details:**
```
GET https://api.twitch.tv/helix/users
Authorization: Bearer ACCESS_TOKEN
Client-Id: YOUR_CLIENT_ID
```

**Response:**
```json
{
  "data": [{
    "id": "123456789",
    "login": "username",
    "display_name": "DisplayName",
    "type": "",
    "broadcaster_type": "partner",
    "description": "Channel description",
    "profile_image_url": "https://...",
    "offline_image_url": "https://...",
    "view_count": 12345,
    "email": "user@example.com",
    "created_at": "2017-05-01T00:00:00Z"
  }]
}
```

## Step 4: Token Storage

Store the following in your PostgreSQL database:

**Users Table:**
- `twitch_user_id` (Primary Key)
- `twitch_username`
- `twitch_display_name`
- `twitch_email`
- `profile_image_url`
- `access_token` (encrypted)
- `refresh_token` (encrypted)
- `token_expires_at`
- `scopes` (JSON array)
- `created_at`
- `updated_at`

**Security Notes:**
- Encrypt access_token and refresh_token before storing
- Use environment variables for encryption keys
- Never log tokens or expose them in API responses

## Step 5: Token Refresh

Access tokens expire after 1 hour. Use refresh tokens to obtain new access tokens:

**POST Request:**
```
POST https://id.twitch.tv/oauth2/token
Content-Type: application/x-www-form-urlencoded

grant_type=refresh_token
&refresh_token=REFRESH_TOKEN
&client_id=YOUR_CLIENT_ID
&client_secret=YOUR_CLIENT_SECRET
```

**Response:**
```json
{
  "access_token": "NEW_ACCESS_TOKEN",
  "refresh_token": "NEW_REFRESH_TOKEN",
  "expires_in": 3600,
  "scope": ["chat:read", "chat:edit"],
  "token_type": "bearer"
}
```

**Implementation:**
- Check token expiration before making API calls
- Automatically refresh tokens when they're about to expire (< 5 minutes remaining)
- Update database with new tokens

## Step 6: Session Management

After successful authentication:

1. Create a session for the user (using express-session or JWT)
2. Store user ID in session
3. Redirect to dashboard/home page
4. Use session to identify authenticated users in subsequent requests

## Step 7: Logout

To revoke access:

**POST Request:**
```
POST https://id.twitch.tv/oauth2/revoke
Content-Type: application/x-www-form-urlencoded

client_id=YOUR_CLIENT_ID
&token=ACCESS_TOKEN_OR_REFRESH_TOKEN
```

Then:
1. Destroy user session
2. Optionally remove tokens from database (or mark as revoked)

## Implementation Checklist

- [ ] Register application in Twitch Developer Console
- [ ] Store Client ID and Client Secret as environment variables
- [ ] Create `/auth/twitch` route to initiate OAuth flow
- [ ] Create `/auth/twitch/callback` route to handle callback
- [ ] Implement token exchange logic
- [ ] Implement token validation and user info retrieval
- [ ] Create database schema for users and tokens
- [ ] Implement token encryption/decryption
- [ ] Implement token refresh logic
- [ ] Create session management middleware
- [ ] Implement logout functionality
- [ ] Add error handling for OAuth failures
- [ ] Test with Railway deployment URLs

## Environment Variables

Required environment variables:

```env
TWITCH_CLIENT_ID=your_client_id_here
TWITCH_CLIENT_SECRET=your_client_secret_here
TWITCH_REDIRECT_URI=https://your-domain.railway.app/auth/twitch/callback
SESSION_SECRET=your_random_session_secret_here
ENCRYPTION_KEY=your_encryption_key_here
```

## Security Best Practices

1. **Always use HTTPS** - OAuth requires secure connections
2. **Validate state parameter** - Prevent CSRF attacks
3. **Encrypt stored tokens** - Never store tokens in plain text
4. **Use environment variables** - Never commit secrets to version control
5. **Implement token refresh** - Handle token expiration gracefully
6. **Validate tokens** - Check token validity before API calls
7. **Handle errors** - Provide clear error messages for auth failures
8. **Rate limiting** - Implement rate limiting on auth endpoints
9. **Log security events** - Log authentication attempts and failures

## Error Handling

Common OAuth errors:

- `invalid_client` - Client ID or secret is incorrect
- `invalid_grant` - Authorization code is invalid or expired
- `invalid_scope` - Requested scope is invalid
- `access_denied` - User denied authorization
- `redirect_uri_mismatch` - Redirect URI doesn't match registered URI

Handle these errors gracefully and provide user-friendly messages.

## References

- [Twitch OAuth Documentation](https://dev.twitch.tv/docs/authentication)
- [Twitch API Reference](https://dev.twitch.tv/docs/api/reference)
- [OAuth 2.0 Specification](https://oauth.net/2/)

