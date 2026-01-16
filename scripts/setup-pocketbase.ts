#!/usr/bin/env npx tsx
/**
 * PocketBase Setup Script
 * 
 * This script creates the core collections for CheckMate in PocketBase.
 * Run this after starting PocketBase for the first time.
 * 
 * Usage:
 *   npx tsx scripts/setup-pocketbase.ts
 * 
 * Prerequisites:
 *   - PocketBase must be running at POCKETBASE_URL (default: http://127.0.0.1:8090)
 *   - Admin account must be created via PocketBase Admin UI first
 */

import PocketBase from 'pocketbase';

const POCKETBASE_URL = process.env.POCKETBASE_URL || 'http://127.0.0.1:8090';

interface CollectionSchema {
  name: string;
  type: 'base' | 'auth';
  schema: SchemaField[];
  options?: Record<string, unknown>;
  listRule?: string | null;
  viewRule?: string | null;
  createRule?: string | null;
  updateRule?: string | null;
  deleteRule?: string | null;
}

interface SchemaField {
  name: string;
  type: string;
  required: boolean;
  options: Record<string, unknown>;
}

// Core collections schema
const coreCollections: CollectionSchema[] = [
  // Workspaces collection
  {
    name: 'workspaces',
    type: 'base',
    schema: [
      {
        name: 'owner',
        type: 'relation',
        required: true,
        options: {
          collectionId: '_pb_users_auth_',
          cascadeDelete: true,
          maxSelect: 1,
        },
      },
      {
        name: 'name',
        type: 'text',
        required: true,
        options: {
          min: 1,
          max: 100,
        },
      },
      {
        name: 'description',
        type: 'text',
        required: false,
        options: {
          max: 500,
        },
      },
      {
        name: 'settings',
        type: 'json',
        required: false,
        options: {
          maxSize: 10000,
        },
      },
      {
        name: 'isArchived',
        type: 'bool',
        required: false,
        options: {},
      },
    ],
    listRule: 'owner = @request.auth.id',
    viewRule: 'owner = @request.auth.id',
    createRule: '@request.auth.id != ""',
    updateRule: 'owner = @request.auth.id',
    deleteRule: 'owner = @request.auth.id',
  },

  // Blueprints collection
  {
    name: 'blueprints',
    type: 'base',
    schema: [
      {
        name: 'workspace',
        type: 'relation',
        required: true,
        options: {
          collectionId: 'workspaces',
          cascadeDelete: true,
          maxSelect: 1,
        },
      },
      {
        name: 'owner',
        type: 'relation',
        required: true,
        options: {
          collectionId: '_pb_users_auth_',
          cascadeDelete: false,
          maxSelect: 1,
        },
      },
      {
        name: 'title',
        type: 'text',
        required: true,
        options: {
          min: 1,
          max: 200,
        },
      },
      {
        name: 'description',
        type: 'editor',
        required: false,
        options: {
          convertUrls: false,
        },
      },
      {
        name: 'visibility',
        type: 'select',
        required: true,
        options: {
          maxSelect: 1,
          values: ['private', 'public', 'shared'],
        },
      },
      {
        name: 'category',
        type: 'text',
        required: false,
        options: {
          max: 50,
        },
      },
      {
        name: 'tags',
        type: 'json',
        required: false,
        options: {
          maxSize: 2000,
        },
      },
      {
        name: 'version',
        type: 'number',
        required: false,
        options: {
          min: 1,
          noDecimal: true,
        },
      },
      {
        name: 'instanceCount',
        type: 'number',
        required: false,
        options: {
          min: 0,
          noDecimal: true,
        },
      },
      {
        name: 'ratingSum',
        type: 'number',
        required: false,
        options: {
          min: 0,
          noDecimal: true,
        },
      },
      {
        name: 'ratingCount',
        type: 'number',
        required: false,
        options: {
          min: 0,
          noDecimal: true,
        },
      },
    ],
    // Access rules based on visibility (Requirements 4.1, 4.2, 4.5):
    // - Private: only owner can access
    // - Public: all users (including anonymous) can read
    // - Shared: owner and collaborators with accepted invitations can access
    listRule: 'visibility = "public" || owner = @request.auth.id || (visibility = "shared" && @collection.collaborators.blueprint = id && @collection.collaborators.user = @request.auth.id && @collection.collaborators.acceptedAt != "")',
    viewRule: 'visibility = "public" || owner = @request.auth.id || (visibility = "shared" && @collection.collaborators.blueprint = id && @collection.collaborators.user = @request.auth.id && @collection.collaborators.acceptedAt != "")',
    createRule: '@request.auth.id != ""',
    // Update: owner OR collaborator with editor/admin permission
    updateRule: 'owner = @request.auth.id || (@collection.collaborators.blueprint = id && @collection.collaborators.user = @request.auth.id && @collection.collaborators.permissionLevel ~ "editor|admin" && @collection.collaborators.acceptedAt != "")',
    deleteRule: 'owner = @request.auth.id',
  },

  // Items collection (checklist items with self-relation for hierarchy)
  {
    name: 'items',
    type: 'base',
    schema: [
      {
        name: 'blueprint',
        type: 'relation',
        required: true,
        options: {
          collectionId: 'blueprints',
          cascadeDelete: true,
          maxSelect: 1,
        },
      },
      {
        name: 'parent',
        type: 'relation',
        required: false,
        options: {
          collectionId: 'items',
          cascadeDelete: true,
          maxSelect: 1,
        },
      },
      {
        name: 'path',
        type: 'text',
        required: true,
        options: {
          min: 1,
          max: 500,
        },
      },
      {
        name: 'itemType',
        type: 'select',
        required: true,
        options: {
          maxSelect: 1,
          values: ['task', 'reference'],
        },
      },
      {
        name: 'content',
        type: 'editor',
        required: true,
        options: {
          convertUrls: false,
        },
      },
      {
        name: 'reference',
        type: 'relation',
        required: false,
        options: {
          collectionId: 'blueprints',
          cascadeDelete: false,
          maxSelect: 1,
        },
      },
      {
        name: 'position',
        type: 'number',
        required: true,
        options: {
          min: 0,
          noDecimal: true,
        },
      },
      {
        name: 'metadata',
        type: 'json',
        required: false,
        options: {
          maxSize: 10000,
        },
      },
    ],
    // Items inherit access from their blueprint (Requirements 4.1, 4.2, 4.5)
    // Read access: public blueprints OR owner OR shared with accepted collaborator
    listRule: '@collection.blueprints.id = blueprint && (@collection.blueprints.visibility = "public" || @collection.blueprints.owner = @request.auth.id || (@collection.blueprints.visibility = "shared" && @collection.collaborators.blueprint = blueprint && @collection.collaborators.user = @request.auth.id && @collection.collaborators.acceptedAt != ""))',
    viewRule: '@collection.blueprints.id = blueprint && (@collection.blueprints.visibility = "public" || @collection.blueprints.owner = @request.auth.id || (@collection.blueprints.visibility = "shared" && @collection.collaborators.blueprint = blueprint && @collection.collaborators.user = @request.auth.id && @collection.collaborators.acceptedAt != ""))',
    // Write access: owner OR collaborator with editor/admin permission
    createRule: '@request.auth.id != "" && @collection.blueprints.id = blueprint && (@collection.blueprints.owner = @request.auth.id || (@collection.collaborators.blueprint = blueprint && @collection.collaborators.user = @request.auth.id && @collection.collaborators.permissionLevel ~ "editor|admin" && @collection.collaborators.acceptedAt != ""))',
    updateRule: '@collection.blueprints.id = blueprint && (@collection.blueprints.owner = @request.auth.id || (@collection.collaborators.blueprint = blueprint && @collection.collaborators.user = @request.auth.id && @collection.collaborators.permissionLevel ~ "editor|admin" && @collection.collaborators.acceptedAt != ""))',
    deleteRule: '@collection.blueprints.id = blueprint && (@collection.blueprints.owner = @request.auth.id || (@collection.collaborators.blueprint = blueprint && @collection.collaborators.user = @request.auth.id && @collection.collaborators.permissionLevel ~ "editor|admin" && @collection.collaborators.acceptedAt != ""))',
  },
];

// Supporting collections schema (collaborators, instances, etc.)
const supportingCollections: CollectionSchema[] = [
  // Collaborators collection
  {
    name: 'collaborators',
    type: 'base',
    schema: [
      {
        name: 'blueprint',
        type: 'relation',
        required: true,
        options: {
          collectionId: 'blueprints',
          cascadeDelete: true,
          maxSelect: 1,
        },
      },
      {
        name: 'user',
        type: 'relation',
        required: true,
        options: {
          collectionId: '_pb_users_auth_',
          cascadeDelete: true,
          maxSelect: 1,
        },
      },
      {
        name: 'permissionLevel',
        type: 'select',
        required: true,
        options: {
          maxSelect: 1,
          values: ['viewer', 'editor', 'admin'],
        },
      },
      {
        name: 'invitedAt',
        type: 'date',
        required: true,
        options: {},
      },
      {
        name: 'acceptedAt',
        type: 'date',
        required: false,
        options: {},
      },
    ],
    // Access rules (Requirements 4.4, 4.5, 4.6):
    // - Blueprint owner can manage all collaborators
    // - Collaborators can view their own collaboration record
    // - Collaborators can accept invitations (update acceptedAt)
    listRule: '@collection.blueprints.id = blueprint && (@collection.blueprints.owner = @request.auth.id || user = @request.auth.id)',
    viewRule: '@collection.blueprints.id = blueprint && (@collection.blueprints.owner = @request.auth.id || user = @request.auth.id)',
    createRule: '@request.auth.id != "" && @collection.blueprints.id = blueprint && @collection.blueprints.owner = @request.auth.id',
    // Owner can update any field, collaborator can only update acceptedAt (to accept invitation)
    updateRule: '@collection.blueprints.id = blueprint && (@collection.blueprints.owner = @request.auth.id || (user = @request.auth.id && @request.data.acceptedAt:isset))',
    // Owner can revoke, collaborator can remove themselves
    deleteRule: '@collection.blueprints.id = blueprint && (@collection.blueprints.owner = @request.auth.id || user = @request.auth.id)',
  },

  // Instances collection
  {
    name: 'instances',
    type: 'base',
    schema: [
      {
        name: 'blueprint',
        type: 'relation',
        required: true,
        options: {
          collectionId: 'blueprints',
          cascadeDelete: false,
          maxSelect: 1,
        },
      },
      {
        name: 'user',
        type: 'relation',
        required: true,
        options: {
          collectionId: '_pb_users_auth_',
          cascadeDelete: true,
          maxSelect: 1,
        },
      },
      {
        name: 'name',
        type: 'text',
        required: true,
        options: {
          min: 1,
          max: 200,
        },
      },
      {
        name: 'isSynced',
        type: 'bool',
        required: false,
        options: {},
      },
      {
        name: 'progress',
        type: 'number',
        required: false,
        options: {
          min: 0,
          max: 100,
          noDecimal: false,
        },
      },
      {
        name: 'completedAt',
        type: 'date',
        required: false,
        options: {},
      },
    ],
    // Owner-only access for instances (Requirement 4.1 - private by nature)
    listRule: 'user = @request.auth.id',
    viewRule: 'user = @request.auth.id',
    createRule: '@request.auth.id != "" && user = @request.auth.id',
    updateRule: 'user = @request.auth.id',
    deleteRule: 'user = @request.auth.id',
  },

  // Instance Items collection
  {
    name: 'instanceItems',
    type: 'base',
    schema: [
      {
        name: 'instance',
        type: 'relation',
        required: true,
        options: {
          collectionId: 'instances',
          cascadeDelete: true,
          maxSelect: 1,
        },
      },
      {
        name: 'sourceItem',
        type: 'relation',
        required: false,
        options: {
          collectionId: 'items',
          cascadeDelete: false,
          maxSelect: 1,
        },
      },
      {
        name: 'parent',
        type: 'relation',
        required: false,
        options: {
          collectionId: 'instanceItems',
          cascadeDelete: true,
          maxSelect: 1,
        },
      },
      {
        name: 'path',
        type: 'text',
        required: true,
        options: {
          min: 1,
          max: 500,
        },
      },
      {
        name: 'content',
        type: 'editor',
        required: true,
        options: {
          convertUrls: false,
        },
      },
      {
        name: 'isCompleted',
        type: 'bool',
        required: false,
        options: {},
      },
      {
        name: 'completedAt',
        type: 'date',
        required: false,
        options: {},
      },
      {
        name: 'isCustom',
        type: 'bool',
        required: false,
        options: {},
      },
      {
        name: 'position',
        type: 'number',
        required: true,
        options: {
          min: 0,
          noDecimal: true,
        },
      },
    ],
    // Access follows instance owner (Requirement 4.1 - private by nature)
    listRule: '@collection.instances.id = instance && @collection.instances.user = @request.auth.id',
    viewRule: '@collection.instances.id = instance && @collection.instances.user = @request.auth.id',
    createRule: '@request.auth.id != "" && @collection.instances.id = instance && @collection.instances.user = @request.auth.id',
    updateRule: '@collection.instances.id = instance && @collection.instances.user = @request.auth.id',
    deleteRule: '@collection.instances.id = instance && @collection.instances.user = @request.auth.id',
  },

  // Notifications collection
  {
    name: 'notifications',
    type: 'base',
    schema: [
      {
        name: 'user',
        type: 'relation',
        required: true,
        options: {
          collectionId: '_pb_users_auth_',
          cascadeDelete: true,
          maxSelect: 1,
        },
      },
      {
        name: 'type',
        type: 'select',
        required: true,
        options: {
          maxSelect: 1,
          values: [
            'collaboration_invite',
            'collaboration_accepted',
            'collaboration_revoked',
            'blueprint_updated',
            'instance_reminder',
            'system',
          ],
        },
      },
      {
        name: 'title',
        type: 'text',
        required: true,
        options: {
          min: 1,
          max: 200,
        },
      },
      {
        name: 'message',
        type: 'text',
        required: false,
        options: {
          max: 1000,
        },
      },
      {
        name: 'data',
        type: 'json',
        required: false,
        options: {
          maxSize: 10000,
        },
      },
      {
        name: 'isRead',
        type: 'bool',
        required: false,
        options: {},
      },
    ],
    // User-only access for notifications
    listRule: 'user = @request.auth.id',
    viewRule: 'user = @request.auth.id',
    // System can create notifications for any user
    createRule: '@request.auth.id != ""',
    updateRule: 'user = @request.auth.id',
    deleteRule: 'user = @request.auth.id',
  },

  // Activity Log collection
  {
    name: 'activityLog',
    type: 'base',
    schema: [
      {
        name: 'user',
        type: 'relation',
        required: true,
        options: {
          collectionId: '_pb_users_auth_',
          cascadeDelete: true,
          maxSelect: 1,
        },
      },
      {
        name: 'resourceType',
        type: 'select',
        required: true,
        options: {
          maxSelect: 1,
          values: [
            'blueprint',
            'item',
            'instance',
            'instanceItem',
            'collaborator',
            'workspace',
          ],
        },
      },
      {
        name: 'resourceId',
        type: 'text',
        required: true,
        options: {
          min: 1,
          max: 50,
        },
      },
      {
        name: 'action',
        type: 'select',
        required: true,
        options: {
          maxSelect: 1,
          values: [
            'create',
            'update',
            'delete',
            'complete',
            'uncomplete',
            'invite',
            'accept',
            'revoke',
          ],
        },
      },
      {
        name: 'metadata',
        type: 'json',
        required: false,
        options: {
          maxSize: 10000,
        },
      },
    ],
    // User can see own activity + activity on shared blueprints they collaborate on
    listRule: 'user = @request.auth.id || (@collection.blueprints.id = resourceId && @collection.blueprints.visibility = "shared" && @collection.collaborators.blueprint = resourceId && @collection.collaborators.user = @request.auth.id && @collection.collaborators.acceptedAt != "")',
    viewRule: 'user = @request.auth.id || (@collection.blueprints.id = resourceId && @collection.blueprints.visibility = "shared" && @collection.collaborators.blueprint = resourceId && @collection.collaborators.user = @request.auth.id && @collection.collaborators.acceptedAt != "")',
    createRule: '@request.auth.id != ""',
    // Activity logs are immutable - no updates allowed
    updateRule: null,
    deleteRule: 'user = @request.auth.id',
  },
];

// User collection custom fields (to be added to the built-in users collection)
const userCustomFields: SchemaField[] = [
  {
    name: 'displayName',
    type: 'text',
    required: false,
    options: {
      max: 100,
    },
  },
  {
    name: 'avatarUrl',
    type: 'url',
    required: false,
    options: {},
  },
  {
    name: 'preferences',
    type: 'json',
    required: false,
    options: {
      maxSize: 10000,
    },
  },
];

async function setupCollections() {
  console.log(`\n🚀 Setting up PocketBase collections at ${POCKETBASE_URL}\n`);

  const pb = new PocketBase(POCKETBASE_URL);

  // Check if PocketBase is running
  try {
    await pb.health.check();
    console.log('✅ PocketBase is running\n');
  } catch (error) {
    console.error('❌ Cannot connect to PocketBase. Make sure it is running.');
    console.error(`   URL: ${POCKETBASE_URL}`);
    process.exit(1);
  }

  // Check for admin authentication
  const adminEmail = process.env.PB_ADMIN_EMAIL;
  const adminPassword = process.env.PB_ADMIN_PASSWORD;

  if (!adminEmail || !adminPassword) {
    console.log('ℹ️  Admin credentials not provided via environment variables.');
    console.log('   Set PB_ADMIN_EMAIL and PB_ADMIN_PASSWORD to run this script.');
    console.log('\n📋 Manual Setup Instructions:');
    console.log('   1. Open PocketBase Admin UI: ' + POCKETBASE_URL + '/_/');
    console.log('   2. Create an admin account if not already done');
    console.log('   3. Import the schema from: docker/pocketbase/pb_schema.json');
    console.log('   4. Or create collections manually following the schema\n');
    console.log('📄 Schema file location: docker/pocketbase/pb_schema.json\n');
    return;
  }

  try {
    // Authenticate as admin
    await pb.admins.authWithPassword(adminEmail, adminPassword);
    console.log('✅ Authenticated as admin\n');

    // Update users collection with custom fields
    console.log('📝 Updating users collection with custom fields...');
    try {
      const usersCollection = await pb.collections.getOne('users');
      const existingFieldNames = usersCollection.schema.map((f: { name: string }) => f.name);
      
      const newFields = userCustomFields.filter(
        (field) => !existingFieldNames.includes(field.name)
      );

      if (newFields.length > 0) {
        await pb.collections.update('users', {
          schema: [...usersCollection.schema, ...newFields],
        });
        console.log(`   ✅ Added ${newFields.length} custom fields to users collection`);
      } else {
        console.log('   ℹ️  Users collection already has custom fields');
      }
    } catch (error) {
      console.log('   ⚠️  Could not update users collection:', (error as Error).message);
    }

    // Create core collections
    for (const collection of coreCollections) {
      console.log(`📝 Creating collection: ${collection.name}...`);
      
      try {
        // Check if collection exists
        await pb.collections.getOne(collection.name);
        console.log(`   ℹ️  Collection "${collection.name}" already exists`);
      } catch {
        // Collection doesn't exist, create it
        try {
          await pb.collections.create(collection);
          console.log(`   ✅ Created collection "${collection.name}"`);
        } catch (createError) {
          console.error(`   ❌ Failed to create "${collection.name}":`, (createError as Error).message);
        }
      }
    }

    // Create supporting collections (collaborators, instances, etc.)
    for (const collection of supportingCollections) {
      console.log(`📝 Creating collection: ${collection.name}...`);
      
      try {
        // Check if collection exists
        await pb.collections.getOne(collection.name);
        console.log(`   ℹ️  Collection "${collection.name}" already exists`);
      } catch {
        // Collection doesn't exist, create it
        try {
          await pb.collections.create(collection);
          console.log(`   ✅ Created collection "${collection.name}"`);
        } catch (createError) {
          console.error(`   ❌ Failed to create "${collection.name}":`, (createError as Error).message);
        }
      }
    }

    console.log('\n✅ Setup complete!\n');
    console.log('📋 Created collections:');
    console.log('   - users (with custom fields: displayName, avatarUrl, preferences)');
    console.log('   - workspaces (with owner relation)');
    console.log('   - blueprints (with visibility and access rules)');
    console.log('   - items (with parent self-relation for hierarchy)');
    console.log('   - collaborators (with permission levels: viewer, editor, admin)');
    console.log('   - instances (owner-only access)');
    console.log('   - instanceItems (follows instance owner access)');
    console.log('   - notifications (user-only access)');
    console.log('   - activityLog (user + shared blueprint collaborators)\n');

  } catch (error) {
    console.error('❌ Setup failed:', (error as Error).message);
    process.exit(1);
  }
}

// Run setup
setupCollections().catch(console.error);
