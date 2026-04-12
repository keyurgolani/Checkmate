/**
 * Schema Initialization Service
 * 
 * Automatically imports PocketBase schema on first app connection.
 * Handles circular dependencies by creating collections without rules first,
 * then updating rules in a second pass.
 */

import fs from 'fs';
import path from 'path';
import { buildField, buildAutodateFields } from '../schema/field-builder';

// Track initialization state
let isInitialized = false;
let initializationPromise: Promise<boolean> | null = null;

const POCKETBASE_URL = process.env.POCKETBASE_URL || process.env.NEXT_PUBLIC_POCKETBASE_URL || 'http://127.0.0.1:8090';
const PB_ADMIN_EMAIL = process.env.PB_ADMIN_EMAIL || 'admin@checkmate.local';
const PB_ADMIN_PASSWORD = process.env.PB_ADMIN_PASSWORD || 'checkmate_admin_2026';

// Order collections to handle dependencies
const COLLECTION_ORDER = [
  'users',
  'workspaces',
  'blueprints',
  'collaborators',
  'items',
  'instances',
  'instanceItems',
  'notifications',
  'activityLog',
];

interface SchemaCollection {
  name: string;
  type: string;
  schema: Array<{
    name: string;
    type: string;
    required: boolean;
    options: Record<string, unknown>;
  }>;
  options?: Record<string, unknown>;
  listRule?: string | null;
  viewRule?: string | null;
  createRule?: string | null;
  updateRule?: string | null;
  deleteRule?: string | null;
  indexes?: string[];
}

/**
 * Checks if the PocketBase schema is set up
 */
async function checkSchemaExists(): Promise<boolean> {
  try {
    // Try to access the workspaces collection - if it exists, schema is set up
    const response = await fetch(`${POCKETBASE_URL}/api/collections/workspaces`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Authenticates as superuser and returns the token
 */
async function authenticateAdmin(): Promise<string | null> {
  try {
    const response = await fetch(`${POCKETBASE_URL}/api/collections/_superusers/auth-with-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identity: PB_ADMIN_EMAIL, password: PB_ADMIN_PASSWORD }),
    });

    if (!response.ok) {
      console.warn('[Schema Init] Could not authenticate as admin');
      return null;
    }

    const data = await response.json();
    return data.token;
  } catch (error) {
    console.warn('[Schema Init] Admin auth failed:', error);
    return null;
  }
}

/**
 * Loads the schema from the embedded JSON or file
 */
async function loadSchema(): Promise<SchemaCollection[]> {
  // Try to load from file first (for development)
  const possiblePaths = [
    path.join(process.cwd(), 'docker/pocketbase/pb_schema.json'),
    path.join(process.cwd(), '../docker/pocketbase/pb_schema.json'),
    '/app/docker/pocketbase/pb_schema.json',
  ];

  for (const schemaPath of possiblePaths) {
    try {
      if (fs.existsSync(schemaPath)) {
        const content = fs.readFileSync(schemaPath, 'utf-8');
        return JSON.parse(content);
      }
    } catch {
      // Continue to next path
    }
  }

  // Fallback: fetch from a known location or use embedded schema
  console.warn('[Schema Init] Could not find pb_schema.json file');
  return [];
}

/**
 * Imports the schema into PocketBase
 */
async function importSchema(token: string): Promise<boolean> {
  console.log('[Schema Init] 📋 Importing schema...');

  const collections = await loadSchema();
  if (collections.length === 0) {
    console.error('[Schema Init] ❌ No schema found to import');
    return false;
  }

  console.log(`[Schema Init] Found ${collections.length} collections to import`);

  // Get existing collections
  const existingResponse = await fetch(`${POCKETBASE_URL}/api/collections`, {
    headers: { 'Authorization': token },
  });
  const existingData = await existingResponse.json();
  const existingCollections = existingData.items || [];
  const existingNames = new Set(existingCollections.map((c: { name: string }) => c.name));
  const collectionIdMap = new Map<string, string>();

  // Build ID map from existing collections
  for (const col of existingCollections) {
    collectionIdMap.set(col.name, col.id);
  }

  // Sort collections by dependency order
  const collectionMap = new Map(collections.map(c => [c.name, c]));
  const orderedCollections = COLLECTION_ORDER
    .filter(name => collectionMap.has(name))
    .map(name => collectionMap.get(name)!);

  // PHASE 1: Create collections without rules
  console.log('[Schema Init] 📦 Phase 1: Creating collections without rules...');

  for (const collection of orderedCollections) {
    if (collection.name === 'users') {
      // Update existing users collection
      console.log('[Schema Init] 📝 Updating users collection with custom fields...');

      const usersResponse = await fetch(`${POCKETBASE_URL}/api/collections/_pb_users_auth_`, {
        headers: { 'Authorization': token },
      });

      if (usersResponse.ok) {
        const usersCollection = await usersResponse.json();
        collectionIdMap.set('users', usersCollection.id);

        const customFields = collection.schema.map(field => buildField(field));
        const existingFields = usersCollection.fields || [];
        const existingFieldNames = new Set(existingFields.map((f: { name: string }) => f.name));

        const mergedFields = [
          ...existingFields,
          ...customFields.filter(f => !existingFieldNames.has(f.name as string)),
        ];

        const updateResponse = await fetch(`${POCKETBASE_URL}/api/collections/_pb_users_auth_`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': token,
          },
          body: JSON.stringify({ fields: mergedFields }),
        });

        if (updateResponse.ok) {
          console.log('[Schema Init]    ✅ Users collection updated');
        } else {
          const error = await updateResponse.text();
          console.log(`[Schema Init]    ⚠️  Could not update users collection: ${error}`);
        }
      }
      continue;
    }

    if (existingNames.has(collection.name)) {
      console.log(`[Schema Init] ⏭️  Skipping "${collection.name}" (already exists)`);
      const existingCol = existingCollections.find((c: { name: string }) => c.name === collection.name);
      if (existingCol) {
        collectionIdMap.set(collection.name, existingCol.id);
      }
      continue;
    }

    console.log(`[Schema Init] 📝 Creating collection: ${collection.name}...`);

    // Build fields, resolving collection IDs
    const fields = collection.schema
      .filter(field => {
        if (field.type !== 'relation') return true;
        const refName = field.options.collectionId as string;
        if (refName === collection.name) return false;
        if (refName !== '_pb_users_auth_' && !collectionIdMap.has(refName)) return false;
        return true;
      })
      .map(field => {
        const fieldDef = buildField(field);

        if (field.type === 'relation' && field.options.collectionId) {
          const refName = field.options.collectionId as string;
          if (refName === '_pb_users_auth_') {
            fieldDef.collectionId = '_pb_users_auth_';
          } else if (collectionIdMap.has(refName)) {
            fieldDef.collectionId = collectionIdMap.get(refName);
          }
        }

        return fieldDef;
      });

    const allFields = [...fields, ...buildAutodateFields()];

    const collectionData: Record<string, unknown> = {
      name: collection.name,
      type: collection.type,
      fields: allFields,
      listRule: null,
      viewRule: null,
      createRule: null,
      updateRule: null,
      deleteRule: null,
    };

    const response = await fetch(`${POCKETBASE_URL}/api/collections`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': token,
      },
      body: JSON.stringify(collectionData),
    });

    if (response.ok) {
      const created = await response.json();
      collectionIdMap.set(collection.name, created.id);
      console.log(`[Schema Init]    ✅ Created "${collection.name}" (id: ${created.id})`);
    } else {
      const error = await response.text();
      console.log(`[Schema Init]    ❌ Failed to create "${collection.name}": ${error}`);
    }
  }

  // PHASE 2: Update rules and fix relation IDs
  console.log('[Schema Init] 🔧 Phase 2: Updating rules and relations...');

  for (const collection of orderedCollections) {
    if (collection.name === 'users') {
      console.log('[Schema Init] 📝 Updating users rules...');
      const updateResponse = await fetch(`${POCKETBASE_URL}/api/collections/_pb_users_auth_`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token,
        },
        body: JSON.stringify({
          listRule: collection.listRule,
          viewRule: collection.viewRule,
          createRule: collection.createRule,
          updateRule: collection.updateRule,
          deleteRule: collection.deleteRule,
        }),
      });

      if (updateResponse.ok) {
        console.log('[Schema Init]    ✅ Users rules updated');
      } else {
        const error = await updateResponse.text();
        console.log(`[Schema Init]    ⚠️  Could not update users rules: ${error}`);
      }
      continue;
    }

    const collectionId = collectionIdMap.get(collection.name);
    if (!collectionId) {
      console.log(`[Schema Init] ⏭️  Skipping "${collection.name}" (no ID found)`);
      continue;
    }

    console.log(`[Schema Init] 📝 Updating "${collection.name}" rules and relations...`);

    const fields = collection.schema.map(field => {
      const fieldDef = buildField(field);

      if (field.type === 'relation' && field.options.collectionId) {
        const refName = field.options.collectionId as string;
        if (refName === '_pb_users_auth_') {
          fieldDef.collectionId = '_pb_users_auth_';
        } else if (collectionIdMap.has(refName)) {
          fieldDef.collectionId = collectionIdMap.get(refName);
        }
      }

      return fieldDef;
    });

    const allFields = [...fields, ...buildAutodateFields()];

    const updateData: Record<string, unknown> = {
      fields: allFields,
      listRule: collection.listRule,
      viewRule: collection.viewRule,
      createRule: collection.createRule,
      updateRule: collection.updateRule,
      deleteRule: collection.deleteRule,
    };

    if (collection.indexes) {
      updateData.indexes = collection.indexes;
    }

    const response = await fetch(`${POCKETBASE_URL}/api/collections/${collectionId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': token,
      },
      body: JSON.stringify(updateData),
    });

    if (response.ok) {
      console.log(`[Schema Init]    ✅ Updated "${collection.name}"`);
    } else {
      const error = await response.text();
      console.log(`[Schema Init]    ⚠️  Could not update "${collection.name}": ${error}`);
    }
  }

  console.log('[Schema Init] ✅ Schema import complete!');
  return true;
}

/**
 * Ensures the PocketBase schema is initialized.
 * Call this on app startup.
 */
export async function ensureSchemaInitialized(): Promise<boolean> {
  if (isInitialized) {
    return true;
  }

  if (initializationPromise) {
    return initializationPromise;
  }

  initializationPromise = (async () => {
    try {
      const schemaExists = await checkSchemaExists();
      if (schemaExists) {
        console.log('[Schema Init] ✅ Schema already exists');
        isInitialized = true;
        return true;
      }

      console.log('[Schema Init] 📋 Schema not found, importing...');

      const token = await authenticateAdmin();
      if (!token) {
        console.error('[Schema Init] ❌ Cannot authenticate as admin');
        return false;
      }

      const success = await importSchema(token);
      if (success) {
        isInitialized = true;
      }

      return success;
    } catch (error) {
      console.error('[Schema Init] ❌ Initialization failed:', error);
      return false;
    } finally {
      initializationPromise = null;
    }
  })();

  return initializationPromise;
}

/**
 * Resets the initialization state (for testing)
 */
export function resetSchemaInitialization(): void {
  isInitialized = false;
  initializationPromise = null;
}
