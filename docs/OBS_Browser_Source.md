# OBS Browser Source Token System

## Overview

This document explains how the OBS browser source token system works and why we need it.

## The Problem

When you add a browser source in OBS Studio:
- OBS creates a **separate browser instance** (headless browser)
- This browser **does NOT share cookies** with your regular browser (Chrome, Firefox, etc.)
- Even if you're logged into MultiBot in Chrome, the OBS browser source won't be logged in
- The OBS browser source needs a way to know **which user's commands to listen to**

## The Solution: Tokens

A **token** is like a special password that:
- Identifies which user the OBS browser source belongs to
- Doesn't expire (unless you regenerate it)
- Can be revoked/regenerated if needed
- Is unique to each user

## How It Works

### 1. Token Generation (In Dashboard)
- User clicks "Generate OBS Token" button
- System creates a unique random token (e.g., `abc123xyz789`)
- Token is saved in database linked to the user
- User gets a URL like: `https://your-domain.com/obs-source?token=abc123xyz789`

### 2. Adding to OBS
- User copies the URL from dashboard
- In OBS Studio: Add Source → Browser Source
- Paste the URL
- OBS loads the page and connects via WebSocket using the token

### 3. Token Validation
- When OBS browser source connects, it sends the token
- Server checks: "Does this token belong to a valid user?"
- If yes: Server knows which user's commands to send
- If no: Connection rejected

### 4. Command Playback
- User's chat commands trigger audio
- Server sends command trigger to OBS browser source via WebSocket
- OBS browser source plays the audio file

## Security Considerations

### Is It Safe?

**Yes, because:**
- Tokens are long, random strings (hard to guess)
- Each user has their own unique token
- Tokens can be regenerated if compromised
- Only the user who owns the token can use it

### What If Someone Gets My Token?

If someone gets your token URL:
- They could potentially trigger your audio commands
- **Solution**: Regenerate your token in the dashboard
- Old token becomes invalid
- New token is generated

### Best Practices

1. **Don't share your OBS token URL publicly**
   - Keep it private, like a password
   - Only use it in your OBS browser source

2. **Regenerate if needed**
   - If you suspect someone has your token
   - If you want to revoke access
   - Just click "Regenerate Token" in dashboard

3. **One token per user**
   - Each user has one OBS token
   - Regenerating creates a new one, invalidates the old one

## Database Structure

```
obs_tokens table:
- id (primary key)
- user_id (links to users table)
- token (unique random string)
- created_at (when token was created)
- last_used_at (when token was last used - for tracking)
```

## User Flow

1. **User logs into dashboard**
2. **User goes to "OBS Setup" section**
3. **User clicks "Generate Token"** (or sees existing token)
4. **User copies the URL**: `https://your-domain.com/obs-source?token=abc123`
5. **User opens OBS Studio**
6. **User adds Browser Source**
7. **User pastes the URL**
8. **OBS browser source connects and starts listening for commands**

## Technical Flow

```
┌─────────────┐
│   Dashboard │
│   (Chrome)  │
└──────┬──────┘
       │ User clicks "Generate Token"
       ▼
┌─────────────┐
│   Server    │
│  Creates    │
│   Token     │
└──────┬──────┘
       │ Token saved to database
       │ URL returned: /obs-source?token=abc123
       ▼
┌─────────────┐
│   OBS       │
│  Browser    │
│   Source    │
└──────┬──────┘
       │ Loads URL with token
       │ Connects via WebSocket
       ▼
┌─────────────┐
│   Server    │
│ Validates   │
│   Token     │
└──────┬──────┘
       │ Token valid → User ID identified
       │ Subscribe to user's command triggers
       ▼
┌─────────────┐
│   Chat      │
│  Command    │
│  Detected   │
└──────┬──────┘
       │ Command trigger sent via WebSocket
       ▼
┌─────────────┐
│   OBS       │
│  Browser    │
│   Source    │
└──────┬──────┘
       │ Plays audio file
       ▼
     Audio plays in stream!
```

## FAQ

### Q: Why not just use my login session?
**A:** OBS browser sources don't share cookies with your regular browser, so they can't access your session.

### Q: Can I have multiple tokens?
**A:** Currently, one token per user. You can regenerate it anytime.

### Q: What if I lose my token URL?
**A:** Just go to dashboard and copy it again, or regenerate a new one.

### Q: Does the token expire?
**A:** No, tokens don't expire automatically. You can regenerate them manually.

### Q: Can someone hack my token?
**A:** Tokens are long random strings, very hard to guess. If someone gets your URL, regenerate the token.

### Q: Do I need to update OBS if I regenerate token?
**A:** Yes, update the browser source URL in OBS with the new token.

## Implementation Details

### Token Generation
- Uses crypto.randomBytes() to generate secure random tokens
- Format: Base64 encoded, 32 bytes = 44 characters
- Example: `aB3xY9mK2pL8nQ5rT7vW1zC4dF6gH0jM`

### Token Storage
- Stored in `obs_tokens` table
- Linked to user via `user_id`
- Indexed for fast lookups

### Token Validation
- When OBS connects, token is validated
- Database lookup: `SELECT user_id FROM obs_tokens WHERE token = ?`
- If found: User ID identified, WebSocket connection established
- If not found: Connection rejected

### WebSocket Connection
- OBS browser source connects to same WebSocket server
- Sends token in initial message
- Server validates and subscribes to user's command triggers
- Commands are pushed in real-time

## Summary

The token system is a simple, secure way to:
1. Identify which user's commands the OBS browser source should listen to
2. Work around the fact that OBS browser sources don't share browser sessions
3. Provide a way to revoke/regenerate access if needed

It's like giving OBS a special key to access your commands, without needing to log in.

