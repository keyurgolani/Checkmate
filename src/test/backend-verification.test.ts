/**
 * Backend Verification Tests
 *
 * Runs on the hermetic PocketBase fixture (src/test/fixture), which loads
 * docker/pocketbase/pb_schema.json through the server's start path. Every
 * test asserts: none returns early, skips itself, or only logs a failure.
 *
 * Run: npm run test:backend
 */

import { describe, it, expect } from 'vitest';
import type { CollectionModel } from 'pocketbase';
import schemaFile from '../../docker/pocketbase/pb_schema.json';
import { BASELINE_COLLECTIONS } from './fixture/pocketbase';
import { createAdminTestClient, createTestClient, seedUser, testDataFactory } from './index';

type RuleName = 'listRule' | 'viewRule' | 'createRule' | 'updateRule' | 'deleteRule';
const RULES: RuleName[] = ['listRule', 'viewRule', 'createRule', 'updateRule', 'deleteRule'];

function getCollection(name: string): Promise<CollectionModel> {
  return createAdminTestClient().collections.getOne(name);
}

function fieldNames(collection: CollectionModel): string[] {
  return collection.fields.map((field) => field.name);
}

function selectValues(collection: CollectionModel, name: string): string[] {
  const field = collection.fields.find((candidate) => candidate.name === name);
  expect(field, `${collection.name}.${name}`).toBeDefined();
  expect(field?.type).toBe('select');
  return field?.values as string[];
}

/** The rules pb_schema.json declares for a collection. */
function declaredRules(name: string): Record<RuleName, string | null> {
  const declared = schemaFile.find((collection) => collection.name === name);
  expect(declared, `pb_schema.json defines ${name}`).toBeDefined();
  return Object.fromEntries(RULES.map((rule) => [rule, declared?.[rule] ?? null])) as Record<RuleName, string | null>;
}

function servedRules(collection: CollectionModel): Record<RuleName, string | null> {
  return Object.fromEntries(RULES.map((rule) => [rule, collection[rule] ?? null])) as Record<RuleName, string | null>;
}

describe('Backend Setup Verification', () => {
  describe('PocketBase Health Check', () => {
    it('should have PocketBase running and healthy', async () => {
      const health = await createTestClient().health.check();
      expect(health.code).toBe(200);
    });

    it('should have collections imported', async () => {
      const collections = await createAdminTestClient().collections.getFullList({ fields: 'name' });
      expect(collections.map((collection) => collection.name)).toEqual(expect.arrayContaining([...BASELINE_COLLECTIONS]));
    });
  });

  describe('Collections Verification', () => {
    it('should have all required collections created', async () => {
      const admin = createAdminTestClient();
      for (const name of BASELINE_COLLECTIONS) {
        const page = await admin.collection(name).getList(1, 1);
        expect(page.page, name).toBe(1);
      }
    });

    it('should have users collection with custom fields', async () => {
      const fields = fieldNames(await getCollection('users'));

      expect(fields).toContain('displayName');
      expect(fields).toContain('avatarUrl');
      expect(fields).toContain('preferences');
    });

    it('should have workspaces collection with correct schema', async () => {
      const fields = fieldNames(await getCollection('workspaces'));

      expect(fields).toContain('owner');
      expect(fields).toContain('name');
      expect(fields).toContain('description');
      expect(fields).toContain('settings');
      expect(fields).toContain('isArchived');
    });

    it('should have blueprints collection with correct schema', async () => {
      const fields = fieldNames(await getCollection('blueprints'));

      expect(fields).toContain('workspace');
      expect(fields).toContain('owner');
      expect(fields).toContain('title');
      expect(fields).toContain('description');
      expect(fields).toContain('visibility');
      expect(fields).toContain('category');
      expect(fields).toContain('tags');
      expect(fields).toContain('version');
    });

    it('should have items collection with correct schema', async () => {
      const fields = fieldNames(await getCollection('items'));

      expect(fields).toContain('blueprint');
      expect(fields).toContain('parent');
      expect(fields).toContain('path');
      expect(fields).toContain('itemType');
      expect(fields).toContain('content');
      expect(fields).toContain('reference');
      expect(fields).toContain('position');
      expect(fields).toContain('metadata');
    });

    it('should have collaborators collection with correct schema', async () => {
      const fields = fieldNames(await getCollection('collaborators'));

      expect(fields).toContain('blueprint');
      expect(fields).toContain('user');
      expect(fields).toContain('permissionLevel');
      expect(fields).toContain('invitedAt');
      expect(fields).toContain('acceptedAt');
    });

    it('should have instances collection with correct schema', async () => {
      const fields = fieldNames(await getCollection('instances'));

      expect(fields).toContain('blueprint');
      expect(fields).toContain('user');
      expect(fields).toContain('name');
      expect(fields).toContain('isSynced');
      expect(fields).toContain('progress');
      expect(fields).toContain('completedAt');
    });

    it('should have instanceItems collection with correct schema', async () => {
      const fields = fieldNames(await getCollection('instanceItems'));

      expect(fields).toContain('instance');
      expect(fields).toContain('sourceItem');
      expect(fields).toContain('parent');
      expect(fields).toContain('path');
      expect(fields).toContain('content');
      expect(fields).toContain('isCompleted');
      expect(fields).toContain('completedAt');
      expect(fields).toContain('isCustom');
      expect(fields).toContain('position');
    });

    it('should have notifications collection with correct schema', async () => {
      const fields = fieldNames(await getCollection('notifications'));

      expect(fields).toContain('user');
      expect(fields).toContain('type');
      expect(fields).toContain('title');
      expect(fields).toContain('message');
      expect(fields).toContain('data');
      expect(fields).toContain('isRead');
    });

    it('should have activityLog collection with correct schema', async () => {
      const fields = fieldNames(await getCollection('activityLog'));

      expect(fields).toContain('user');
      expect(fields).toContain('resourceType');
      expect(fields).toContain('resourceId');
      expect(fields).toContain('action');
      expect(fields).toContain('metadata');
    });
  });

  // These compare the rules PocketBase serves with the ones pb_schema.json
  // declares. #25 replaces them with behavioral tests per actor.
  describe('Collection Access Rules Verification', () => {
    it('should serve the workspaces access rules declared in pb_schema.json', async () => {
      expect(servedRules(await getCollection('workspaces'))).toEqual(declaredRules('workspaces'));
    });

    it('should serve the blueprints access rules declared in pb_schema.json', async () => {
      expect(servedRules(await getCollection('blueprints'))).toEqual(declaredRules('blueprints'));
    });

    it('should serve the instances access rules declared in pb_schema.json', async () => {
      expect(servedRules(await getCollection('instances'))).toEqual(declaredRules('instances'));
    });

    it('should serve the notifications access rules declared in pb_schema.json', async () => {
      expect(servedRules(await getCollection('notifications'))).toEqual(declaredRules('notifications'));
    });

    it('should have activityLog with immutable update rule', async () => {
      const collection = await getCollection('activityLog');

      expect(collection.updateRule).toBeNull();
      expect(servedRules(collection)).toEqual(declaredRules('activityLog'));
    });
  });

  describe('Visibility Select Options Verification', () => {
    it('should have blueprints visibility with correct options', async () => {
      const values = selectValues(await getCollection('blueprints'), 'visibility');

      expect(values).toContain('private');
      expect(values).toContain('public');
      expect(values).toContain('shared');
    });

    it('should have collaborators permissionLevel with correct options', async () => {
      const values = selectValues(await getCollection('collaborators'), 'permissionLevel');

      expect(values).toContain('viewer');
      expect(values).toContain('editor');
      expect(values).toContain('admin');
    });

    it('should have items itemType with correct options', async () => {
      const values = selectValues(await getCollection('items'), 'itemType');

      expect(values).toContain('task');
      expect(values).toContain('reference');
    });
  });
});

describe('Basic CRUD Operations Test', () => {
  describe('User Registration and Authentication', () => {
    it('should allow user registration', async () => {
      const email = testDataFactory.email();
      const password = testDataFactory.password();

      const user = await createTestClient().collection('users').create({
        email,
        password,
        passwordConfirm: password,
        displayName: 'Test User',
      });

      expect(user.id).toBeDefined();
      // PocketBase 0.23+ hides email from other requesters unless emailVisibility is set.
      const stored = await createAdminTestClient().collection('users').getOne(user.id);
      expect(stored.email).toBe(email);
    });

    it('should allow user authentication', async () => {
      const user = await seedUser({ displayName: 'Auth Test User' });
      const pb = createTestClient();

      const authData = await pb.collection('users').authWithPassword(user.email, user.password);

      expect(authData.token).toBeDefined();
      expect(authData.record.id).toBe(user.id);
      expect(pb.authStore.isValid).toBe(true);
    });
  });

  describe('Workspace CRUD Operations', () => {
    it('should create a workspace for authenticated user', async () => {
      const user = await seedUser({ displayName: 'Workspace Test User' });
      const pb = await user.signIn(createTestClient());
      const workspaceData = testDataFactory.workspace();

      const workspace = await pb.collection('workspaces').create({
        ...workspaceData,
        owner: user.id,
      });

      expect(workspace.id).toBeDefined();
      expect(workspace.name).toBe(workspaceData.name);
    });

    it('should not allow unauthenticated workspace creation', async () => {
      const workspaceData = testDataFactory.workspace();

      await expect(
        createTestClient().collection('workspaces').create({
          ...workspaceData,
          owner: 'fake-user-id',
        })
      ).rejects.toThrow();
    });
  });

  describe('Anonymous Access to Public Blueprints', () => {
    it('should allow listing public blueprints without authentication', async () => {
      const result = await createTestClient().collection('blueprints').getList(1, 10, {
        filter: "visibility = 'public'",
      });

      expect(result).toBeDefined();
      expect(Array.isArray(result.items)).toBe(true);
    });
  });
});
