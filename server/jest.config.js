module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/*.test.js'],
  collectCoverageFrom: ['index.js', 'integrations/**/*.js'],
  coveragePathIgnorePatterns: ['/node_modules/'],
};
