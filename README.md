# MultiBot Web

Web-based version of MultiBot for Twitch stream management.

## Project Structure

```
MultiBot-Web-Ex/
├── config/           # Configuration files
│   ├── database.js   # PostgreSQL connection
│   ├── twitch.js     # Twitch OAuth configuration
│   └── encryption.js # Token encryption utilities
├── controllers/      # Route handlers
│   └── authController.js
├── database/         # Database schemas
│   └── schema.sql
├── middleware/       # Express middleware
│   └── auth.js
├── models/           # Database models
│   └── user.js
├── routes/           # Route definitions
│   ├── auth.js
│   ├── dashboard.js
│   └── index.js
├── services/         # Business logic
│   └── twitchAuth.js
├── public/           # Static files
│   └── index.html
├── tests/            # Test files
│   ├── scripts/      # E2E and integration test scripts
│   ├── unit/         # Jest unit tests
│   ├── integration/  # Jest integration tests
│   ├── docs/         # Test documentation
│   └── README.md
├── docs/             # Project documentation
│   ├── Authentication.md
│   ├── OBS_Browser_Source.md
│   ├── PROJECT_STRUCTURE.md
│   ├── REFACTORING_PLAN.md
│   └── REFACTORING_STATUS.md
└── server.js         # Main entry point
```

## Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

### 2. Set Up Environment Variables

Create a `.env` file in the root directory:

```env
PORT=3000
NODE_ENV=development

TWITCH_CLIENT_ID=your_client_id_here
TWITCH_CLIENT_SECRET=your_client_secret_here
TWITCH_REDIRECT_URI=http://localhost:3000/auth/twitch/callback

SESSION_SECRET=your_random_session_secret_here
ENCRYPTION_KEY=your_32_byte_encryption_key_here

DATABASE_URL=postgresql://user:password@localhost:5432/multibot
```

## Deploying on Railway

This project is ready to deploy on Railway using Nixpacks (`railway.json` is included).

### Required Railway Variables

Set these in Railway → Service → Variables:

- **NODE_ENV**: `production`
- **SESSION_SECRET**: a long random string (required in production)
- **ENCRYPTION_KEY**: stable key for encrypting tokens (required in production)
  - Recommended format: **64 hex characters** (32 bytes)
- **DATABASE_URL**: provided automatically if you add a Railway Postgres plugin (or set it manually)
- **TWITCH_CLIENT_ID**
- **TWITCH_CLIENT_SECRET**
- **TWITCH_REDIRECT_URI**: must match your deployed URL, e.g. `https://<your-domain>/auth/twitch/callback`

### Notes

- **Port binding**: Railway injects `PORT`; the server listens on it automatically.
- **Health check**: Railway will hit `GET /healthz`.
- **Sessions**: in production the app runs behind Railway’s proxy; the server is configured to trust it so secure cookies work.

### 3. Set Up PostgreSQL Database

1. Create a PostgreSQL database:
```bash
createdb multibot
```

2. Run the schema:
```bash
psql multibot < database/schema.sql
```

Or connect to your database and run the SQL from `database/schema.sql`.

### 4. Generate Secrets

Generate a session secret:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Generate an encryption key:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 5. Run the Server

Development mode:
```bash
npm run dev
```

Production mode:
```bash
npm start
```

The server will run on `http://localhost:3000`

### 6. Run Tests

Run all tests:
```bash
npm test
```

Run tests in watch mode:
```bash
npm run test:watch
```

Run tests with coverage:
```bash
npm run test:coverage
```

## Features

- ✅ Twitch OAuth Authentication
- ✅ Secure token storage with encryption
- ✅ Session management
- ✅ User profile management
- ✅ Modern UI with Tailwind CSS
- ✅ Comprehensive test coverage (70% minimum)

## Next Steps

- [ ] Implement bot configuration dashboard
- [ ] Add Twitch chat integration
- [ ] Implement bot features (TTS, audio commands, etc.)
- [ ] Add user settings page

