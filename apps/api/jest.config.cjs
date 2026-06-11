/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testRegex: '\\.spec\\.ts$',
  collectCoverageFrom: ['src/**/*.ts', '!src/main.ts', '!src/instrument.ts'],
};
