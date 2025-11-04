export default {
  testEnvironment: 'node',
  transform: {},
  testMatch: ['**/*.test.js', '!**/node_modules/**', '!**/examples/**', '!**/integration-tests/**'],
  collectCoverageFrom: [
    'core/**/*.js',
    '!core/**/*.test.js',
    'governance/**/*.js',
    '!governance/**/*.test.js',
    'security/**/*.js',
    '!security/**/*.test.js',
    'reporters/**/*.js',
    '!reporters/**/*.test.js',
    'cli/**/*.js',
    '!cli/**/*.test.js'
  ],
  coverageDirectory: 'coverage',
  verbose: true
};
