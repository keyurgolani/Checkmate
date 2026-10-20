/**
 * PocketBase Test Helpers
 *
 * Backend suites run in the vitest `backend` project, whose global setup
 * starts a hermetic PocketBase (src/test/fixture) and provides its URL and a
 * superuser token. These helpers read that, never a developer's server.
 */

import PocketBase from 'pocketbase';
import { inject } from 'vitest';
import { adminClient, seedUser as seedFixtureUser, type SeedUserOptions, type SeededUser } from './fixture/client';

export type { SeedUserOptions, SeededUser };

/** The shared fixture's URL and superuser token. Throws outside the backend project. */
export function backendFixture(): { url: string; adminToken: string } {
  const provided = inject('pocketbase');
  if (!provided?.url || !provided.adminToken) {
    throw new Error('No PocketBase fixture: run backend suites through the vitest "backend" project (npm run test:backend).');
  }
  return provided;
}

/** An unauthenticated client for the shared fixture. */
export function createTestClient(): PocketBase {
  return new PocketBase(backendFixture().url);
}

/** A client authenticated as the fixture's per-run superuser. */
export function createAdminTestClient(): PocketBase {
  const { url, adminToken } = backendFixture();
  return adminClient(url, adminToken);
}

/** Creates a user through the superuser, independent of the users create rule. */
export function seedUser(options?: SeedUserOptions): Promise<SeededUser> {
  const { url, adminToken } = backendFixture();
  return seedFixtureUser(url, adminToken, options);
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
