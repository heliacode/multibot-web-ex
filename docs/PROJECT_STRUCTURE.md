# Project Structure

## Directory Organization

```
multibot-web-ex/
├── config/              # Configuration files
│   ├── database.js      # Database connection
│   ├── encryption.js    # Encryption utilities
│   └── twitch.js        # Twitch OAuth config
│
├── controllers/         # Route handlers (business logic)
│   ├── audioCommandController.js
│   ├── authController.js
│   ├── bitTriggerController.js
│   ├── chatController.js
│   ├── designController.js
│   ├── gifController.js
│   ├── imageController.js
│   └── obsTokenController.js
│
├── database/            # Database migrations and schemas
│   ├── schema.sql
│   ├── add_*.sql        # Migration files
│   └── ...
│
├── middleware/          # Express middleware
│   └── auth.js
│
├── models/              # Database models
│   ├── audioCommand.js
│   ├── bitTrigger.js
│   ├── designElement.js
│   ├── gifCommand.js
│   ├── obsToken.js
│   ├── user.js
│   └── userImage.js
│
├── public/              # Static files served to clients
│   ├── css/
│   ├── js/              # Frontend JavaScript modules
│   ├── dashboard.html
│   ├── obs-source.html
│   └── uploads/         # User-uploaded files
│
├── routes/              # Express route definitions
│   ├── audioCommands.js
│   ├── auth.js
│   ├── bitTriggers.js
│   ├── chat.js
│   ├── dashboard.js
│   ├── design.js
│   ├── gifCommands.js
│   ├── images.js
│   ├── obsSource.js
│   ├── obsToken.js
│   └── test.js          # Test/debug endpoints (not test files)
│
├── scripts/             # Utility scripts (NOT tests)
│   ├── check-db-connection.js
│   ├── init-db.js
│   ├── pre-deployment-check.js
│   ├── run-migration.js
│   └── verify-db.js
│
├── services/            # Business logic services
│   ├── fileUpload.js
│   ├── giphy.js
│   ├── imageUpload.js
│   ├── twitchAuth.js
│   └── twitchChat.js
│
├── tests/               # All test files organized by type
│   ├── scripts/         # E2E and integration test scripts
│   │   ├── test-obs-source-flow.js
│   │   ├── test-bits-simulation.js
│   │   └── ... (all test-*.js files)
│   │
│   ├── unit/            # Jest unit tests
│   │   ├── config/
│   │   ├── controllers/
│   │   ├── middleware/
│   │   ├── models/
│   │   ├── routes/
│   │   ├── services/
│   │   └── utils/
│   │
│   ├── integration/     # Jest integration tests
│   │   └── ...
│   │
│   ├── docs/            # Test documentation
│   │   ├── TEST_COVERAGE_VALIDATION.md
│   │   ├── TEST_RESULTS.md
│   │   ├── TESTING_GUIDE.md (moved to tests/docs/)
│   │   └── OBS_SOURCE_TESTS.md
│   │
│   ├── setup.js         # Jest setup file
│   └── README.md         # Test documentation
│
├── website/             # Marketing website files
│   ├── index.html
│   ├── blog/
│   └── ...
│
├── server.js            # Main application entry point
├── package.json
├── jest.config.js
└── README.md
```

## Key Organizational Principles

1. **Tests are separated from scripts**
   - `scripts/` = Utility scripts (database setup, migrations, checks)
   - `tests/scripts/` = Test scripts (e2e, integration tests)
   - `tests/unit/` = Jest unit tests
   - `tests/integration/` = Jest integration tests

2. **Documentation is organized**
   - Test docs in `tests/docs/`
   - Project docs in root (README.md, CONTRIBUTING.md, etc.)

3. **Clear separation of concerns**
   - Controllers handle HTTP requests
   - Models handle database operations
   - Services contain business logic
   - Routes define endpoints

## Running Tests

See `tests/README.md` for detailed test running instructions.
