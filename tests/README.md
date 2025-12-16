# Tests Directory

This directory contains all test files organized by type.

## Structure

```
tests/
├── scripts/          # End-to-end and integration test scripts
│   ├── test-obs-source-flow.js
│   ├── test-bits-simulation.js
│   ├── test-all-commands.js
│   └── ... (all test-*.js files)
│
├── unit/             # Jest unit tests
│   ├── config/       # Configuration tests
│   ├── controllers/  # Controller tests
│   ├── middleware/   # Middleware tests
│   ├── models/       # Model tests
│   ├── routes/       # Route tests
│   ├── services/     # Service tests
│   └── utils/        # Utility tests
│
├── integration/      # Integration tests (Jest)
│   ├── commands.integration.test.js
│   ├── obsSource.integration.test.js
│   └── ...
│
├── docs/             # Test documentation
│   ├── TEST_COVERAGE_VALIDATION.md
│   ├── TEST_RESULTS.md
│   └── TESTING_GUIDE.md
│
├── setup.js          # Jest setup file
└── README.md          # This file
```

## Running Tests

### Unit Tests (Jest)
```bash
npm test                    # Run all unit tests
npm run test:watch         # Watch mode
npm run test:coverage       # With coverage
```

### Integration/E2E Tests
```bash
npm run test:integration   # OBS source flow
npm run test:obs           # OBS source tests
npm run test:route         # Route tests
npm run test:commands      # All commands
npm run test:commands:e2e  # End-to-end audio/GIF
npm run test:bits          # Bits simulation
npm run test:all           # Integration + unit tests
```

## Test Scripts Location

All test scripts (test-*.js) have been moved from `scripts/` to `tests/scripts/` for better organization. Utility scripts remain in `scripts/` (e.g., `init-db.js`, `pre-deployment-check.js`).
