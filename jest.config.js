/** @type {import('jest').Config} */
module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: '.',
  roots: ['<rootDir>/test'],
  testMatch: ['<rootDir>/test/**/*Spec.ts'],
  testPathIgnorePatterns: ['/node_modules/', '/dist/'],
  transform: {
    '^.+\\.(t|j)s$': ['ts-jest', { tsconfig: 'tsconfig.json' }],
  },
  moduleNameMapper: {
    '^@modules/(.*)$': '<rootDir>/src/Modules/$1',
    '^@common/(.*)$': '<rootDir>/src/Common/$1',
    '^@shared/(.*)$': '<rootDir>/src/Shared/$1',
    '^@core/(.*)$': '<rootDir>/src/Core/$1',
    '^@app/(.*)$': '<rootDir>/src/$1',
    '^@test/(.*)$': '<rootDir>/test/$1',
  },
  collectCoverageFrom: ['<rootDir>/src/**/*.{ts,js}', '!<rootDir>/dist/**', '!<rootDir>/test/**'],
  coveragePathIgnorePatterns: ['/node_modules/', '/dist/', '/test/'],
  coverageDirectory: './coverage',
  clearMocks: true,
  testEnvironment: 'node',
  testTimeout: 60000,
};
