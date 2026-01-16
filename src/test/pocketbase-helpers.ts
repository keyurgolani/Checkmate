/**
 * PocketBase Test Helpers
 * Utilities for testing PocketBase-related functionality
 */

import PocketBase from 'pocketbase';

// Test PocketBase URL - uses environment variable or defaults to local dev
const TEST_POCKETBASE_URL = process.env.TEST_POCKETBASE_URL || 'http://127.0.0.1:8090';

/**
 * Creates a PocketBase client for testing
 */
export function createTestClient(): PocketBase {
  return new PocketBase(TEST_POCKETBASE_URL);
}

/**
 * Creates an authenticated test client
 * @param email - Test user email
 * @param password - Test user password
 */
export async function createAuthenticatedTestClient(
  email: string,
  password: string
): Promise<PocketBase> {
  const pb = createTestClient();
  await pb.collection('users').authWithPassword(email, password);
  return pb;
}

/**
 * Clears authentication from a PocketBase client
 */
export function clearAuth(pb: PocketBase): void {
  pb.authStore.clear();
}

/**
 * Test data factory for creating test records
 */
export const testDataFactory = {
  /**
   * Creates a unique test email
   */
  email: () => `test-${Date.now()}-${Math.random().toString(36).slice(2)}@test.local`,

  /**
   * Creates a valid test password
   */
  password: () => 'TestPassword123!',

  /**
   * Creates a unique test username
   */
  username: () => `testuser_${Date.now()}_${Math.random().toString(36).slice(2)}`,

  /**
   * Creates test blueprint data
   */
  blueprint: (overrides: Partial<BlueprintTestData> = {}): BlueprintTestData => ({
    title: `Test Blueprint ${Date.now()}`,
    description: 'A test blueprint for testing purposes',
    visibility: 'private',
    category: 'test',
    tags: ['test'],
    ...overrides,
  }),

  /**
   * Creates test checklist item data
   */
  item: (overrides: Partial<ItemTestData> = {}): ItemTestData => ({
    type: 'task',
    content: `Test item ${Date.now()}`,
    position: 0,
    ...overrides,
  }),

  /**
   * Creates test workspace data
   */
  workspace: (overrides: Partial<WorkspaceTestData> = {}): WorkspaceTestData => ({
    name: `Test Workspace ${Date.now()}`,
    description: 'A test workspace',
    ...overrides,
  }),
};

/**
 * Type definitions for test data
 */
export interface BlueprintTestData {
  title: string;
  description: string;
  visibility: 'private' | 'public' | 'shared';
  category: string;
  tags: string[];
}

export interface ItemTestData {
  type: 'task' | 'reference';
  content: string;
  position: number;
  referenceId?: string;
  parentId?: string;
}

export interface WorkspaceTestData {
  name: string;
  description: string;
}

/**
 * Waits for PocketBase to be available
 * Useful for integration tests that need the server running
 */
export async function waitForPocketBase(
  maxAttempts = 10,
  delayMs = 500
): Promise<boolean> {
  const pb = createTestClient();
  
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      await pb.health.check();
      return true;
    } catch {
      if (attempt < maxAttempts - 1) {
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }
  }
  
  return false;
}

/**
 * Checks if PocketBase is available
 */
export async function isPocketBaseAvailable(): Promise<boolean> {
  const pb = createTestClient();
  try {
    await pb.health.check();
    return true;
  } catch {
    return false;
  }
}

/**
 * Admin credentials from environment variables
 */
const ADMIN_EMAIL = process.env.PB_ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.PB_ADMIN_PASSWORD;

/**
 * Checks if admin credentials are configured
 */
export function hasAdminCredentials(): boolean {
  return !!(ADMIN_EMAIL && ADMIN_PASSWORD);
}

/**
 * Creates an admin-authenticated PocketBase client
 * Required for accessing collection metadata via pb.collections API
 * @returns Authenticated PocketBase client or null if credentials not available
 */
export async function createAdminClient(): Promise<PocketBase | null> {
  if (!hasAdminCredentials()) {
    return null;
  }
  
  const pb = createTestClient();
  try {
    await pb.admins.authWithPassword(ADMIN_EMAIL!, ADMIN_PASSWORD!);
    return pb;
  } catch (error) {
    console.log('Admin authentication failed:', error);
    return null;
  }
}

/**
 * Authenticates an existing PocketBase client as admin
 * @param pb - PocketBase client to authenticate
 * @returns true if authentication succeeded, false otherwise
 */
export async function authenticateAsAdmin(pb: PocketBase): Promise<boolean> {
  if (!hasAdminCredentials()) {
    return false;
  }
  
  try {
    await pb.admins.authWithPassword(ADMIN_EMAIL!, ADMIN_PASSWORD!);
    return true;
  } catch (error) {
    console.log('Admin authentication failed:', error);
    return false;
  }
}
