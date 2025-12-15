# Testing Guide

This directory contains all tests for MultiBot Web.

## Test Structure

Tests are organized to mirror the source code structure:

```
tests/
├── config/          # Configuration tests
├── controllers/     # Controller tests
├── middleware/      # Middleware tests
├── models/         # Model tests (requires DB)
├── routes/         # Route integration tests
├── services/       # Service tests
└── setup.js        # Test setup and configuration
```

## Running Tests

### Run all tests
```bash
npm test
```

### Run tests in watch mode
```bash
npm run test:watch
```

### Run tests with coverage
```bash
npm run test:coverage
```

## Test Coverage Goals

We aim for:
- **70% minimum coverage** across all modules
- **100% coverage** for critical paths (authentication, security)
- All new features must include tests

## Writing Tests

### Test Naming Convention
- Test files: `*.test.js`
- Test descriptions: Use descriptive `describe` and `it` blocks

### Example Test Structure
```javascript
import { functionToTest } from '../../path/to/module.js';

describe('Module Name', () => {
  describe('functionToTest', () => {
    it('should do something specific', () => {
      // Arrange
      const input = 'test';
      
      // Act
      const result = functionToTest(input);
      
      // Assert
      expect(result).toBe('expected');
    });
  });
});
```

## Mocking

- Use Jest mocks for external dependencies (Twitch API, database)
- Mock at the module level, not implementation level
- Keep mocks close to the tests that use them

## Database Tests

For database-related tests:
- Use a separate test database
- Set up and tear down test data in `beforeEach`/`afterEach`
- Use transactions that rollback after each test

## Integration Tests

Integration tests should:
- Test full request/response cycles
- Use Supertest for HTTP testing
- Mock external APIs but test internal integrations

