# Railway Deployment Guide

This guide covers deploying MultiBot Web to Railway and initializing the database.

## Prerequisites

1. A Railway account (sign up at [railway.app](https://railway.app))
2. A Twitch application with OAuth credentials
3. Railway Postgres plugin (add via Railway dashboard)

## Step 1: Deploy to Railway

1. **Connect your repository** to Railway
2. **Add Postgres plugin**:
   - In your Railway project, click "New" → "Database" → "Add PostgreSQL"
   - Railway will automatically set `DATABASE_URL` environment variable

3. **Set Environment Variables**:
   Go to your service → Variables and add:

   ```
   NODE_ENV=production
   SESSION_SECRET=<generate-random-string>
   ENCRYPTION_KEY=<generate-64-hex-characters>
   TWITCH_CLIENT_ID=<your-twitch-client-id>
   TWITCH_CLIENT_SECRET=<your-twitch-client-secret>
   TWITCH_REDIRECT_URI=https://<your-railway-domain>/auth/twitch/callback
   ```

   **Generate secrets:**
   ```bash
   # Session secret (any random string)
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   
   # Encryption key (64 hex characters = 32 bytes)
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```

4. **Deploy**: Railway will automatically build and deploy your app

## Step 2: Database Initialization (Automatic! ✅)

**Database initialization happens automatically!** 

The app is configured to automatically check and initialize the database on every startup. The initialization script is idempotent (safe to run multiple times), so:

- ✅ **First deployment**: Database will be initialized automatically
- ✅ **Subsequent startups**: Database check runs but skips already-existing tables
- ✅ **No manual steps required**: Everything happens automatically

You can verify database initialization in Railway logs - look for:
```
🔍 Checking database initialization...
✅ Database initialization complete!
🚀 Starting server...
```

**Manual initialization (optional):**
If you need to manually run the database initialization script:
```bash
railway run npm run init-db
```

## Step 3: Verify Deployment

1. **Check health endpoint**: Visit `https://<your-domain>/healthz`
   - Should return: `{"ok":true,"timestamp":"..."}`

2. **Test the app**: Visit `https://<your-domain>`
   - You should see the landing page
   - Click "Login with Twitch" to test authentication

3. **Check logs**: In Railway dashboard, verify:
   - No database connection errors
   - Server started successfully
   - Health checks are passing

## Troubleshooting

### Health Check Stuck

If Railway health checks are taking too long:

1. **Check server logs** in Railway dashboard for errors
2. **Verify PORT** is being used correctly (Railway sets this automatically)
3. **Check database connection** - ensure `DATABASE_URL` is set
4. **Verify `/healthz` endpoint** responds quickly (should be < 100ms)

### Database Connection Issues

1. **Verify DATABASE_URL** is set correctly in Railway variables
2. **Check Postgres plugin** is running and connected
3. **Run database init script** manually to verify connection:
   ```bash
   railway run npm run init-db
   ```

### Authentication Not Working

1. **Verify TWITCH_REDIRECT_URI** matches your Railway domain exactly
2. **Update Twitch app settings**:
   - Go to [Twitch Developer Console](https://dev.twitch.tv/console)
   - Add your Railway URL to OAuth redirect URLs
   - Format: `https://<your-domain>/auth/twitch/callback`

### Environment Variables Not Loading

1. **Check variable names** are exact (case-sensitive)
2. **Redeploy** after adding/changing variables
3. **Verify NODE_ENV** is set to `production`

## Database Migration Script

The `scripts/init-db-railway.js` script:

- ✅ Checks for existing tables before creating them
- ✅ Runs all migrations in the correct order
- ✅ Safe to run multiple times (idempotent)
- ✅ Provides detailed logging
- ✅ Handles Railway's SSL database connections

Run it anytime you need to update your database schema or verify it's initialized correctly.

## Post-Deployment Checklist

- [ ] Health check passing (`/healthz`)
- [ ] Twitch OAuth redirect URI configured
- [ ] Environment variables set correctly
- [ ] Database initialized automatically (check logs)
- [ ] Can log in with Twitch
- [ ] Database tables created successfully (check logs for confirmation)

## Updating Database Schema

When you add new migrations:

1. Add the SQL file to `database/` folder
2. Add it to the `MIGRATIONS` array in `scripts/init-db-railway.js`
3. Run `npm run init-db` on Railway to apply migrations

The script will automatically skip migrations that have already been applied.
