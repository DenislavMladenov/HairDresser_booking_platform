const swcOptions = require('../jest.swc');

/**
 * Integration tests: a real NestJS application against a real PostgreSQL
 * database. Run serially, because they share one database and several of them
 * assert on global state such as rate limit counters.
 */

/** @type {import('jest').Config} */
module.exports = {
  rootDir: '..',
  testEnvironment: 'node',
  testMatch: ['<rootDir>/test/**/*.e2e-spec.ts'],
  transform: { '^.+\\.ts$': ['@swc/jest', swcOptions] },
  moduleNameMapper: {
    '^@booking/shared$': '<rootDir>/../../packages/shared/src/index.ts',
  },
  setupFiles: ['<rootDir>/test/setup-env.ts'],
  globalSetup: '<rootDir>/test/global-setup.ts',
  maxWorkers: 1,
  testTimeout: 30_000,
  clearMocks: true,
};
