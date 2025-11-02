/** @type {import('@jest/types').Config.InitialOptions} */
module.exports = {
  preset: 'ts-jest/presets/default-esm',
  testEnvironment: 'allure-jest/jsdom',
  roots: ['<rootDir>/src'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  setupFilesAfterEnv: ['<rootDir>/src/setupTests.ts'],
  transform: {
    '^.+\\.(ts|tsx)$': [
      'ts-jest',
      {
        useESM: true,
        tsconfig: '<rootDir>/tsconfig.app.json',
        diagnostics: true,
      },
    ],
  },
  extensionsToTreatAsEsm: ['.ts', '.tsx'],
  moduleNameMapper: {
    '^.+\\\.(css|less|scss|sass)$': '<rootDir>/src/__tests__/__mocks__/styleMock.js',
    '^.+\\\.(png|jpg|jpeg|gif|svg|webp|avif)$': '<rootDir>/src/__tests__/__mocks__/fileMock.js',
    '^lucide-react$': '<rootDir>/src/__tests__/__mocks__/lucide-react.tsx',
  },
  testRegex: ['src/__tests__/.*\\.test\\.(ts|tsx)$', 'src/__tests__/.*\\.spec\\.(ts|tsx)$'],
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/main.tsx',
    '!src/**/*.d.ts',
    '!src/**/index.ts',
  ],
  reporters: [
    'default',
    // Allure integrates via the environment; results go to ./allure-results by default
  ],
  // Ensure ESM default handling
  transformIgnorePatterns: [
    'node_modules/(?!(lucide-react)/)'
  ],
  modulePathIgnorePatterns: ['<rootDir>/src/__tests__/__mocks__/lucide-react.ts$'],
};
