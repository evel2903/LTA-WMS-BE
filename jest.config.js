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
  collectCoverageFrom: ['<rootDir>/src/**/*.{ts,js}', '!<rootDir>/dist/**', '!<rootDir>/test/**'],
  coveragePathIgnorePatterns: ['/node_modules/', '/dist/', '/test/'],
  coverageDirectory: './coverage',
  clearMocks: true,
  testEnvironment: 'node',
};
