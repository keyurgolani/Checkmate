/**
 * Test setup file for Vitest
 * This file runs before all tests
 */

import { beforeAll, afterAll, afterEach } from 'vitest';

// Global test setup
beforeAll(async () => {
  // Setup code that runs once before all tests
  console.log('🧪 Test suite starting...');
});

afterAll(async () => {
  // Cleanup code that runs once after all tests
  console.log('🧪 Test suite complete.');
});

afterEach(async () => {
  // Cleanup code that runs after each test
});
