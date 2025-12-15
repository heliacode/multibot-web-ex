# Contributing Guidelines

## Testing Before Committing

**Always run tests before committing changes!** This prevents regressions from reaching production.

### Quick Test (Recommended)
```bash
npm run test:integration
```

This runs critical integration tests that verify:
- ✅ Token generation and authentication
- ✅ URL encoding/decoding
- ✅ Token regeneration
- ✅ OBS source loading

### Full Test Suite
```bash
npm run test:all
```

### Pre-Deployment Check
```bash
npm run pre-deploy
```

This checks:
- Server is running
- Integration tests pass
- Database connection works
- Critical files exist
- Environment variables are set

## Test Coverage

We aim for:
- **Integration tests** for critical flows (OBS source, authentication)
- **Unit tests** for individual functions (when Jest mocking works)
- **Manual testing** for UI/UX flows

## What to Test

When making changes, test:

1. **OBS Source Changes**: 
   ```bash
   npm run test:integration
   ```
   Then manually verify in OBS browser source

2. **API Changes**: 
   - Run integration tests
   - Test with actual HTTP requests

3. **Database Changes**:
   - Run `node scripts/init-db.js` to verify migrations
   - Check database structure: `node scripts/verify-db.js`

## Reporting Issues

If tests fail:
1. Check the error message
2. Review recent changes
3. Run `npm run test:integration` to isolate the issue
4. Fix the issue before committing

## CI/CD

Tests run automatically on:
- Push to `main` or `develop` branches
- Pull requests

If CI fails, fix the issues before merging.

