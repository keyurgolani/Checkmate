#!/usr/bin/env npx tsx
/**
 * Create PocketBase collections for CheckMate
 */

import PocketBase from 'pocketbase';

const POCKETBASE_URL = process.env.POCKETBASE_URL || 'http://127.0.0.1:8090';

async function createCollections() {
  const pb = new PocketBase(POCKETBASE_URL);
  
  // Authenticate as admin
  const adminEmail = process.env.PB_ADMIN_EMAIL || 'admin@checkmate.local';
  const adminPassword = process.env.PB_ADMIN_PASSWORD || 'AdminPassword123!';
  
  try {
    await pb.collection('_superusers').authWithPassword(adminEmail, adminPassword);
    console.log('✅ Authenticated as admin');
  } catch (error) {
    console.error('❌ Admin authentication failed:', error);
    process.exit(1);
  }

  // Delete existing collections if they exist (except users)
  const collectionsToDelete = ['activityLog', 'notifications', 'instanceItems', 'instances', 'collaborators', 'items', 'blueprints', 'workspaces'];
  for (const name of collectionsToDelete) {
    try {
      const col = await pb.collections.getOne(name);
      await pb.collections.delete(col.id);
      console.log(`🗑️  Deleted existing collection: ${name}`);
    } catch {
      // Collection doesn't exist, that's fine
    }
  }

  // Helper to get collection ID by name
  const collectionIds: Record<string, string> = {
    '_pb_users_auth_': '_pb_users_auth_',
  };
  
  async function getCollectionId(name: string): Promise<string> {
    if (collectionIds[name]) return collectionIds[name];
    try {
      const col = await pb.collections.getOne(name);
      collectionIds[name] = col.id;
      return col.id;
    } catch {
      return name; // fallback to name
    }
  }

  // Create workspaces first
  console.log('\n📝 Creating collections...');
  
  try {
    const result = await pb.collections.create({
      name: 'workspaces',
      type: 'base',
      fields: [
        { name: 'owner', type: 'relation', required: true, collectionId: '_pb_users_auth_', cascadeDelete: true, maxSelect: 1 },
        { name: 'name', type: 'text', required: true, min: 1, max: 100 },
        { name: 'description', type: 'text', required: false, max: 500 },
        { name: 'settings', type: 'json', required: false, maxSize: 10000 },
        { name: 'isArchived', type: 'bool', required: false },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
    });
    collectionIds['workspaces'] = result.id;
    console.log(`✅ Created collection: workspaces (${result.id})`);
  } catch (error: unknown) {
    const err = error as { response?: { data?: unknown }; message?: string };
    console.error('❌ Failed to create workspaces:', err.response?.data || err.message);
  }

  // Create blueprints
  try {
    const workspacesId = await getCollectionId('workspaces');
    const result = await pb.collections.create({
      name: 'blueprints',
      type: 'base',
      fields: [
        { name: 'workspace', type: 'relation', required: true, collectionId: workspacesId, cascadeDelete: true, maxSelect: 1 },
        { name: 'owner', type: 'relation', required: true, collectionId: '_pb_users_auth_', cascadeDelete: false, maxSelect: 1 },
        { name: 'title', type: 'text', required: true, min: 1, max: 200 },
        { name: 'description', type: 'editor', required: false },
        { name: 'visibility', type: 'select', required: true, maxSelect: 1, values: ['private', 'public', 'shared'] },
        { name: 'category', type: 'text', required: false, max: 50 },
        { name: 'tags', type: 'json', required: false, maxSize: 2000 },
        { name: 'version', type: 'number', required: false, min: 1, onlyInt: true },
        { name: 'instanceCount', type: 'number', required: false, min: 0, onlyInt: true },
        { name: 'ratingSum', type: 'number', required: false, min: 0, onlyInt: true },
        { name: 'ratingCount', type: 'number', required: false, min: 0, onlyInt: true },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
    });
    collectionIds['blueprints'] = result.id;
    console.log(`✅ Created collection: blueprints (${result.id})`);
  } catch (error: unknown) {
    const err = error as { response?: { data?: unknown }; message?: string };
    console.error('❌ Failed to create blueprints:', err.response?.data || err.message);
  }

  // Create items (self-referencing, so create without parent first, then update)
  try {
    const blueprintsId = await getCollectionId('blueprints');
    const result = await pb.collections.create({
      name: 'items',
      type: 'base',
      fields: [
        { name: 'blueprint', type: 'relation', required: true, collectionId: blueprintsId, cascadeDelete: true, maxSelect: 1 },
        { name: 'path', type: 'text', required: true, min: 1, max: 500 },
        { name: 'itemType', type: 'select', required: true, maxSelect: 1, values: ['task', 'reference'] },
        { name: 'content', type: 'editor', required: true },
        { name: 'reference', type: 'relation', required: false, collectionId: blueprintsId, cascadeDelete: false, maxSelect: 1 },
        { name: 'position', type: 'number', required: false, min: 0, onlyInt: true },
        { name: 'metadata', type: 'json', required: false, maxSize: 10000 },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
    });
    collectionIds['items'] = result.id;
    console.log(`✅ Created collection: items (${result.id})`);
    
    // Now add the self-referencing parent field
    await pb.collections.update(result.id, {
      fields: [
        ...result.fields,
        { name: 'parent', type: 'relation', required: false, collectionId: result.id, cascadeDelete: true, maxSelect: 1 },
      ],
    });
    console.log('✅ Added parent field to items');
  } catch (error: unknown) {
    const err = error as { response?: { data?: unknown }; message?: string };
    console.error('❌ Failed to create items:', err.response?.data || err.message);
  }

  // Create collaborators
  try {
    const blueprintsId = await getCollectionId('blueprints');
    const result = await pb.collections.create({
      name: 'collaborators',
      type: 'base',
      fields: [
        { name: 'blueprint', type: 'relation', required: true, collectionId: blueprintsId, cascadeDelete: true, maxSelect: 1 },
        { name: 'user', type: 'relation', required: true, collectionId: '_pb_users_auth_', cascadeDelete: true, maxSelect: 1 },
        { name: 'permissionLevel', type: 'select', required: true, maxSelect: 1, values: ['viewer', 'editor', 'admin'] },
        { name: 'invitedAt', type: 'date', required: true },
        { name: 'acceptedAt', type: 'date', required: false },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: ['CREATE UNIQUE INDEX idx_collaborators_unique ON collaborators (blueprint, user)'],
    });
    collectionIds['collaborators'] = result.id;
    console.log(`✅ Created collection: collaborators (${result.id})`);
  } catch (error: unknown) {
    const err = error as { response?: { data?: unknown }; message?: string };
    console.error('❌ Failed to create collaborators:', err.response?.data || err.message);
  }

  // Create instances
  try {
    const blueprintsId = await getCollectionId('blueprints');
    const result = await pb.collections.create({
      name: 'instances',
      type: 'base',
      fields: [
        { name: 'blueprint', type: 'relation', required: true, collectionId: blueprintsId, cascadeDelete: false, maxSelect: 1 },
        { name: 'user', type: 'relation', required: true, collectionId: '_pb_users_auth_', cascadeDelete: true, maxSelect: 1 },
        { name: 'name', type: 'text', required: true, min: 1, max: 200 },
        { name: 'isSynced', type: 'bool', required: false },
        { name: 'progress', type: 'number', required: false, min: 0, max: 100 },
        { name: 'completedAt', type: 'date', required: false },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
    });
    collectionIds['instances'] = result.id;
    console.log(`✅ Created collection: instances (${result.id})`);
  } catch (error: unknown) {
    const err = error as { response?: { data?: unknown }; message?: string };
    console.error('❌ Failed to create instances:', err.response?.data || err.message);
  }

  // Create instanceItems (self-referencing)
  try {
    const instancesId = await getCollectionId('instances');
    const itemsId = await getCollectionId('items');
    const result = await pb.collections.create({
      name: 'instanceItems',
      type: 'base',
      fields: [
        { name: 'instance', type: 'relation', required: true, collectionId: instancesId, cascadeDelete: true, maxSelect: 1 },
        { name: 'sourceItem', type: 'relation', required: false, collectionId: itemsId, cascadeDelete: false, maxSelect: 1 },
        { name: 'path', type: 'text', required: true, min: 1, max: 500 },
        { name: 'content', type: 'editor', required: true },
        { name: 'isCompleted', type: 'bool', required: false },
        { name: 'completedAt', type: 'date', required: false },
        { name: 'isCustom', type: 'bool', required: false },
        { name: 'position', type: 'number', required: false, min: 0, onlyInt: true },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
    });
    collectionIds['instanceItems'] = result.id;
    console.log(`✅ Created collection: instanceItems (${result.id})`);
    
    // Add self-referencing parent field
    await pb.collections.update(result.id, {
      fields: [
        ...result.fields,
        { name: 'parent', type: 'relation', required: false, collectionId: result.id, cascadeDelete: true, maxSelect: 1 },
      ],
    });
    console.log('✅ Added parent field to instanceItems');
  } catch (error: unknown) {
    const err = error as { response?: { data?: unknown }; message?: string };
    console.error('❌ Failed to create instanceItems:', err.response?.data || err.message);
  }

  // Create notifications
  try {
    const result = await pb.collections.create({
      name: 'notifications',
      type: 'base',
      fields: [
        { name: 'user', type: 'relation', required: true, collectionId: '_pb_users_auth_', cascadeDelete: true, maxSelect: 1 },
        { name: 'type', type: 'select', required: true, maxSelect: 1, values: ['collaboration_invite', 'collaboration_accepted', 'collaboration_revoked', 'blueprint_updated', 'instance_reminder', 'system'] },
        { name: 'title', type: 'text', required: true, min: 1, max: 200 },
        { name: 'message', type: 'text', required: false, max: 1000 },
        { name: 'data', type: 'json', required: false, maxSize: 10000 },
        { name: 'isRead', type: 'bool', required: false },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
    });
    collectionIds['notifications'] = result.id;
    console.log(`✅ Created collection: notifications (${result.id})`);
  } catch (error: unknown) {
    const err = error as { response?: { data?: unknown }; message?: string };
    console.error('❌ Failed to create notifications:', err.response?.data || err.message);
  }

  // Create activityLog
  try {
    const result = await pb.collections.create({
      name: 'activityLog',
      type: 'base',
      fields: [
        { name: 'user', type: 'relation', required: true, collectionId: '_pb_users_auth_', cascadeDelete: true, maxSelect: 1 },
        { name: 'resourceType', type: 'select', required: true, maxSelect: 1, values: ['blueprint', 'item', 'instance', 'instanceItem', 'collaborator', 'workspace'] },
        { name: 'resourceId', type: 'text', required: true, min: 1, max: 50 },
        { name: 'action', type: 'select', required: true, maxSelect: 1, values: ['create', 'update', 'delete', 'complete', 'uncomplete', 'invite', 'accept', 'revoke'] },
        { name: 'metadata', type: 'json', required: false, maxSize: 10000 },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
    });
    collectionIds['activityLog'] = result.id;
    console.log(`✅ Created collection: activityLog (${result.id})`);
  } catch (error: unknown) {
    const err = error as { response?: { data?: unknown }; message?: string };
    console.error('❌ Failed to create activityLog:', err.response?.data || err.message);
  }

  // Now update with rules
  console.log('\n📝 Updating collection rules...');
  
  const rules: Record<string, { listRule?: string | null; viewRule?: string | null; createRule?: string | null; updateRule?: string | null; deleteRule?: string | null }> = {
    workspaces: {
      listRule: 'owner = @request.auth.id',
      viewRule: 'owner = @request.auth.id',
      createRule: "@request.auth.id != ''",
      updateRule: 'owner = @request.auth.id',
      deleteRule: 'owner = @request.auth.id',
    },
    blueprints: {
      listRule: "visibility = 'public' || owner = @request.auth.id || (visibility = 'shared' && @collection.collaborators.blueprint = id && @collection.collaborators.user = @request.auth.id && @collection.collaborators.acceptedAt != '')",
      viewRule: "visibility = 'public' || owner = @request.auth.id || (visibility = 'shared' && @collection.collaborators.blueprint = id && @collection.collaborators.user = @request.auth.id && @collection.collaborators.acceptedAt != '')",
      createRule: "@request.auth.id != ''",
      updateRule: "owner = @request.auth.id || (@collection.collaborators.blueprint = id && @collection.collaborators.user = @request.auth.id && @collection.collaborators.permissionLevel ~ 'editor|admin' && @collection.collaborators.acceptedAt != '')",
      deleteRule: 'owner = @request.auth.id',
    },
    items: {
      listRule: "@collection.blueprints.id = blueprint && (@collection.blueprints.visibility = 'public' || @collection.blueprints.owner = @request.auth.id || (@collection.blueprints.visibility = 'shared' && @collection.collaborators.blueprint = blueprint && @collection.collaborators.user = @request.auth.id && @collection.collaborators.acceptedAt != ''))",
      viewRule: "@collection.blueprints.id = blueprint && (@collection.blueprints.visibility = 'public' || @collection.blueprints.owner = @request.auth.id || (@collection.blueprints.visibility = 'shared' && @collection.collaborators.blueprint = blueprint && @collection.collaborators.user = @request.auth.id && @collection.collaborators.acceptedAt != ''))",
      createRule: "@request.auth.id != '' && @collection.blueprints.id = blueprint && (@collection.blueprints.owner = @request.auth.id || (@collection.collaborators.blueprint = blueprint && @collection.collaborators.user = @request.auth.id && @collection.collaborators.permissionLevel ~ 'editor|admin' && @collection.collaborators.acceptedAt != ''))",
      updateRule: "@collection.blueprints.id = blueprint && (@collection.blueprints.owner = @request.auth.id || (@collection.collaborators.blueprint = blueprint && @collection.collaborators.user = @request.auth.id && @collection.collaborators.permissionLevel ~ 'editor|admin' && @collection.collaborators.acceptedAt != ''))",
      deleteRule: "@collection.blueprints.id = blueprint && (@collection.blueprints.owner = @request.auth.id || (@collection.collaborators.blueprint = blueprint && @collection.collaborators.user = @request.auth.id && @collection.collaborators.permissionLevel ~ 'editor|admin' && @collection.collaborators.acceptedAt != ''))",
    },
    collaborators: {
      listRule: '@collection.blueprints.id = blueprint && (@collection.blueprints.owner = @request.auth.id || user = @request.auth.id)',
      viewRule: '@collection.blueprints.id = blueprint && (@collection.blueprints.owner = @request.auth.id || user = @request.auth.id)',
      createRule: "@request.auth.id != '' && @collection.blueprints.id = blueprint && @collection.blueprints.owner = @request.auth.id",
      updateRule: '@collection.blueprints.id = blueprint && @collection.blueprints.owner = @request.auth.id',
      deleteRule: '@collection.blueprints.id = blueprint && (@collection.blueprints.owner = @request.auth.id || user = @request.auth.id)',
    },
    instances: {
      listRule: 'user = @request.auth.id',
      viewRule: 'user = @request.auth.id',
      createRule: "@request.auth.id != '' && user = @request.auth.id",
      updateRule: 'user = @request.auth.id',
      deleteRule: 'user = @request.auth.id',
    },
    instanceItems: {
      listRule: '@collection.instances.id = instance && @collection.instances.user = @request.auth.id',
      viewRule: '@collection.instances.id = instance && @collection.instances.user = @request.auth.id',
      createRule: "@request.auth.id != '' && @collection.instances.id = instance && @collection.instances.user = @request.auth.id",
      updateRule: '@collection.instances.id = instance && @collection.instances.user = @request.auth.id',
      deleteRule: '@collection.instances.id = instance && @collection.instances.user = @request.auth.id',
    },
    notifications: {
      listRule: 'user = @request.auth.id',
      viewRule: 'user = @request.auth.id',
      createRule: "@request.auth.id != ''",
      updateRule: 'user = @request.auth.id',
      deleteRule: 'user = @request.auth.id',
    },
    activityLog: {
      listRule: 'user = @request.auth.id',
      viewRule: 'user = @request.auth.id',
      createRule: "@request.auth.id != ''",
      updateRule: null,
      deleteRule: 'user = @request.auth.id',
    },
  };

  for (const [name, rule] of Object.entries(rules)) {
    try {
      const col = await pb.collections.getOne(name);
      await pb.collections.update(col.id, rule);
      console.log(`✅ Updated rules for: ${name}`);
    } catch (error: unknown) {
      const err = error as { response?: { data?: unknown }; message?: string };
      console.error(`❌ Failed to update rules for ${name}:`, err.response?.data || err.message);
    }
  }

  // Update users collection with custom fields
  console.log('\n📝 Updating users collection...');
  try {
    const usersCol = await pb.collections.getOne('users');
    await pb.collections.update(usersCol.id, {
      fields: [
        ...usersCol.fields,
        { name: 'displayName', type: 'text', required: false, max: 100 },
        { name: 'avatarUrl', type: 'url', required: false },
        { name: 'preferences', type: 'json', required: false, maxSize: 10000 },
        { name: 'failedLoginAttempts', type: 'number', required: false, min: 0, onlyInt: true },
        { name: 'lastFailedLogin', type: 'date', required: false },
        { name: 'lockedUntil', type: 'date', required: false },
      ],
      listRule: '',
      viewRule: '',
      createRule: '',
      updateRule: 'id = @request.auth.id',
      deleteRule: 'id = @request.auth.id',
    });
    console.log('✅ Updated users collection');
  } catch (error: unknown) {
    const err = error as { response?: { data?: unknown }; message?: string };
    console.error('❌ Failed to update users:', err.response?.data || err.message);
  }

  console.log('\n✅ Collection setup complete!');
}

createCollections().catch(console.error);
