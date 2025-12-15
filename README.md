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
│   ├── config/
│   ├── controllers/
│   ├── middleware/
│   ├── services/
│   └── README.md
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

