# OBS Source Tests

This document describes the test suite for OBS Source functionality.

## Test Files

### 1. `tests/utils/tokenExtraction.test.js`
Tests the client-side token extraction logic that runs in the browser.

**What it tests:**
- Token extraction from URL query parameters
- Handling of special characters (including `=` at the end)
- URL encoding/decoding
- Fallback mechanisms
- Edge cases (unicode, long tokens, etc.)

**Run:** `npm test -- tests/utils/tokenExtraction.test.js`

### 2. `tests/routes/obsSource.test.js`
Tests the OBS source route handler.

**What it tests:**
- Error page when token is missing
- Success response when token is provided
- Token replacement in HTML
- Special character handling
- Mobile responsiveness

**Run:** `npm test -- tests/routes/obsSource.test.js`

### 3. `tests/controllers/obsTokenController.test.js`
Tests the OBS token API endpoints.

**What it tests:**
- Token generation
- Token validation
- Authentication requirements
- Error handling

**Run:** `npm test -- tests/controllers/obsTokenController.test.js`

### 4. `scripts/test-obs-source.js`
Quick integration test script that tests the actual running server.

**What it tests:**
- Server is running
- Route responds correctly
- Token extraction works
- Error handling

**Run:** `npm run test:obs` (requires server to be running)

## Running All Tests

```bash
# Run all OBS-related tests
npm test -- --testPathPattern="obs|token"

# Run token extraction tests only
npm test -- tests/utils/tokenExtraction.test.js

# Run route tests only
npm test -- tests/routes/obsSource.test.js

# Run quick integration test (requires server)
npm run test:obs
```

## Test Coverage

The tests cover:
- ✅ Token extraction from URLs
- ✅ Special character handling (`=`, `+`, `/`, etc.)
- ✅ Error cases (missing token, invalid token)
- ✅ Route responses (200, 400)
- ✅ HTML content validation
- ✅ Mobile responsiveness
- ✅ Token validation API

## Common Issues Tested

1. **Token with `=` at the end** - Fixed and tested ✅
2. **Missing token** - Returns proper error page ✅
3. **URL encoding issues** - Properly handled ✅
4. **Special characters** - All handled correctly ✅

## Adding New Tests

When adding new OBS source features:

1. Add unit tests for the logic in `tests/utils/`
2. Add route tests in `tests/routes/`
3. Add integration tests in `scripts/`
4. Update this document

## Continuous Testing

To avoid manual testing:

```bash
# Watch mode - reruns tests on file changes
npm run test:watch

# Run tests before committing
npm test
```

