// Test setup file - runs before all tests
// Set environment variables that all tests need

process.env.JWT_SECRET = 'test-jwt-secret-for-testing-at-least-32-characters-long';
process.env.NODE_ENV = 'test';
process.env.MONGODB_URI = 'mongodb://localhost:27017/sandicoin-test';
process.env.MINING_REWARD = '50';
process.env.MINE_RATE = '1000';
process.env.STARTING_BALANCE = '1000';
process.env.ENABLE_NETWORK = 'false';  // Disable networking in tests
process.env.PORT = '3333';  // Different port for tests