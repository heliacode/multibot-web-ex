# Testing Guide

## Quick Start

**Before committing any changes, run:**
```bash
npm run test:integration
```

This will catch regressions in critical functionality like token authentication.

## Available Test Commands

### Integration Tests (Recommended)
```bash
npm run test:integration
```
**What it tests:**
- ✅ Token generation and storage
- ✅ Token URL encoding/decoding (handles +, /, = characters)
- ✅ Token lookup and validation  
- ✅ Token regeneration (old token invalidated, new token works)
- ✅ OBS source HTML generation
- ✅ Server connectivity

**Why use this:** These tests use real database connections and HTTP requests, so they catch real issues.

### Pre-Deployment Check
```bash
npm run pre-deploy
```
**What it checks:**
- Server is running
- Integration tests pass
- Database connection works
- Critical files exist
- Environment variables are set

**When to use:** Before deploying to production.

### Unit Tests (Jest)
```bash
npm test
```
**Status:** Some tests have ES module mocking issues, but many still pass.

### All Tests
```bash
npm run test:all
```
Runs integration tests + unit tests.

## What Gets Tested

### ✅ Critical Flows (Integration Tests)
1. **OBS Token Flow**
   - Token generation
   - Token storage in database
   - Token lookup by token string
   - URL encoding/decoding (critical for base64 tokens with +, /, =)
   - Token regeneration (old token deleted, new token created)
   - OBS source route loading with token

2. **Design Elements Flow** (when implemented)
   - Saving design elements
   - Loading design elements
   - Rendering in OBS source

### ⚠️ Known Test Issues
- Jest ES module mocking has path resolution issues
- Some unit tests fail due to `jest.mock()` path problems
- Integration tests work reliably

## Test Files

### Integration Tests
- `tests/scripts/test-obs-source-flow.js` - End-to-end OBS source flow
- `tests/integration/obsSource.integration.test.js` - Jest integration tests

### Unit Tests
- `tests/unit/routes/obsSource.test.js` - Route tests (has mocking issues)
- `tests/unit/controllers/*.test.js` - Controller tests (some have mocking issues)
- `tests/unit/services/*.test.js` - Service tests
- `tests/unit/models/*.test.js` - Model tests

## CI/CD

Tests run automatically on:
- Push to `main` or `develop` branches
- Pull requests

See `.github/workflows/test.yml` for CI configuration.

## Best Practices

1. **Always run integration tests before committing**
   ```bash
   npm run test:integration
   ```

2. **Before deploying, run pre-deployment check**
   ```bash
   npm run pre-deploy
   ```

3. **When adding new features:**
   - Add integration test for critical paths
   - Test happy path and error cases
   - Test edge cases (special characters, encoding, etc.)

4. **If tests fail:**
   - Don't commit the changes
   - Fix the issue
   - Re-run tests
   - Verify manually if needed

## Manual Testing Checklist

Even with automated tests, manually verify:

- [ ] Generate OBS token in dashboard
- [ ] Copy token URL
- [ ] Use URL in OBS browser source
- [ ] Verify WebSocket connects
- [ ] Verify authentication succeeds
- [ ] Test audio command playback
- [ ] Verify design elements appear
- [ ] Regenerate token
- [ ] Verify old token stops working
- [ ] Verify new token works

## Troubleshooting

### Tests fail with "Server not running"
```bash
# Start server in another terminal
npm start

# Then run tests
npm run test:integration
```

### Tests fail with database errors
```bash
# Check database connection
node scripts/check-db-connection.js

# Initialize database
node scripts/init-db.js
```

### Token authentication fails
- Check token URL encoding
- Verify token exists in database: `node scripts/verify-db.js`
- Check server logs for errors
- Regenerate token and try again

## Adding New Tests

When adding new features, add tests to `tests/scripts/test-obs-source-flow.js`:

```javascript
// Example: Test new feature
it('should handle new feature correctly', async () => {
  // Test code here
  expect(result).toBe(expected);
});
```

Then run:
```bash
npm run test:integration
```

