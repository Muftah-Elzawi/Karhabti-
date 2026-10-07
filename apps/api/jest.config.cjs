/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testRegex: '\\.spec\\.ts$',
  // Workspace packages resolve to TS source in tests (their "main" points to dist).
  moduleNameMapper: {
    '^@karhabti/validation$': '<rootDir>/../../packages/validation/src/index.ts',
  },
  collectCoverageFrom: ['src/**/*.ts', '!src/main.ts', '!src/instrument.ts'],
};
