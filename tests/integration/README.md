# Integration Tests

These tests verify critical functionality end-to-end without complex mocking.

## Running Integration Tests

```bash
# Test OBS source flow (token generation, encoding, authentication)
npm run test:integration

# Run all tests (integration + unit tests)
npm run test:all
```

## What These Tests Cover

### OBS Source Flow (`obsSource.integration.test.js`)
- ✅ Token generation and storage
- ✅ Token URL encoding/decoding (handles +, /, = characters)
- ✅ Token lookup and validation
- ✅ Token regeneration (old token invalidated, new token works)
- ✅ OBS source HTML generation
- ✅ Design elements loading
- ✅ Error handling (graceful degradation)

## Why Integration Tests?

Unit tests with Jest have ES module mocking issues. Integration tests:
- Use real database connections
- Test actual HTTP requests
- Verify complete flows
- Catch regressions before production

## Pre-deployment Checklist

Before deploying to production, run:

```bash
# 1. Run integration tests
npm run test:integration

# 2. Run unit tests (if they pass)
npm test

# 3. Manual verification
# - Generate OBS token
# - Use token in OBS browser source
# - Verify authentication works
# - Verify design elements load
```

## Adding New Tests

When adding new features:
1. Add integration test for critical paths
2. Test happy path and error cases
3. Test edge cases (special characters, encoding, etc.)
4. Run tests before committing

