const swcOptions = require('./jest.swc');

/**
 * Unit tests: pure logic, no database and no HTTP. Fast enough to run on every
 * save. Integration coverage lives in test/jest-integration.config.js.
 */

/** @type {import('jest').Config} */
module.exports = {
  rootDir: '.',
  testEnvironment: 'node',
  testMatch: ['<rootDir>/src/**/*.spec.ts'],
  transform: { '^.+\\.ts$': ['@swc/jest', swcOptions] },
  // Resolve the shared package from source so unit tests never depend on it
  // having been built first.
  moduleNameMapper: {
    '^@booking/shared$': '<rootDir>/../../packages/shared/src/index.ts',
  },
  clearMocks: true,
  restoreMocks: true,
};
