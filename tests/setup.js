// Global test setup
import dotenv from 'dotenv';
import * as jestGlobals from '@jest/globals';

// Load test environment variables
dotenv.config({ path: '.env.test' });

// Set test environment
process.env.NODE_ENV = 'test';

// Make jest available globally for ES modules
// This allows test files to use jest.fn(), jest.mock(), etc. without importing
if (typeof global !== 'undefined') {
  global.jest = jestGlobals.jest;
}

