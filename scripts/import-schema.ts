#!/usr/bin/env npx tsx
/**
 * Import PocketBase Schema Script
 * 
 * Imports the schema from pb_schema.json into PocketBase 0.25.x
 * Handles circular dependencies by creating collections without rules first,
 * then updating rules in a second pass.
 * 
 * Usage:
 *   npm run setup:schema
 *   # or with explicit credentials:
 *   PB_ADMIN_EMAIL=admin@checkmate.dev PB_ADMIN_PASSWORD=password123456 npx tsx scripts/import-schema.ts
 */

import fs from 'fs';
import path from 'path';
import { buildField, buildAutodateFields } from '../src/lib/schema/field-builder';

// Load environment variables from .env.local if not already set
function loadEnvFile() {
  const envPath = path.join(__dirname, '../.env.local');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf-8');
    for (const line of envContent.split('\n')) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const [key, ...valueParts] = trimmed.split('=');
        const value = valueParts.join('=');
        if (key && value && !process.env[key]) {
          process.env[key] = value;
        }
      }
    }
  }
}

loadEnvFile();

const POCKETBASE_URL = process.env.POCKETBASE_URL || 'http://127.0.0.1:8090';
const ADMIN_EMAIL = process.env.PB_ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.PB_ADMIN_PASSWORD;

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

async function main() {
  console.log(`\n🚀 Importing PocketBase schema at ${POCKETBASE_URL}\n`);

  if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
    console.error('❌ PB_ADMIN_EMAIL and PB_ADMIN_PASSWORD environment variables are required');
    process.exit(1);
  }

  // Authenticate as superuser
  console.log('🔐 Authenticating as superuser...');
  const authResponse = await fetch(`${POCKETBASE_URL}/api/collections/_superusers/auth-with-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identity: ADMIN_EMAIL, password: ADMIN_PASSWORD }),
  });

  if (!authResponse.ok) {
    const error = await authResponse.text();
    console.error('❌ Authentication failed:', error);
    process.exit(1);
  }

  const authData = await authResponse.json();
  const token = authData.token;
  console.log('✅ Authenticated successfully\n');

  // Read schema file
  const schemaPath = path.join(__dirname, '../docker/pocketbase/pb_schema.json');
  const schemaContent = fs.readFileSync(schemaPath, 'utf-8');
  const collections: SchemaCollection[] = JSON.parse(schemaContent);

  console.log(`📋 Found ${collections.length} collections to import\n`);

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

  // PHASE 1: Create collections without rules (to handle circular dependencies)
  console.log('📦 Phase 1: Creating collections without rules...\n');
  
  for (const collection of orderedCollections) {
    if (collection.name === 'users') {
      // Update existing users collection
      console.log(`📝 Updating users collection with custom fields...`);
      
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
          console.log('   ✅ Users collection updated');
        } else {
          const error = await updateResponse.text();
          console.log(`   ⚠️  Could not update users collection: ${error}`);
        }
      }
      continue;
    }

    if (existingNames.has(collection.name)) {
      console.log(`⏭️  Skipping "${collection.name}" (already exists)`);
      // Get the ID for existing collection
      const existingCol = existingCollections.find((c: { name: string }) => c.name === collection.name);
      if (existingCol) {
        collectionIdMap.set(collection.name, existingCol.id);
      }
      continue;
    }

    console.log(`📝 Creating collection: ${collection.name}...`);

    // Build fields, resolving collection IDs
    // Skip self-references and unresolved references for now
    const fields = collection.schema
      .filter(field => {
        if (field.type !== 'relation') return true;
        const refName = field.options.collectionId as string;
        // Skip self-references
        if (refName === collection.name) return false;
        // Skip references to collections that don't exist yet
        if (refName !== '_pb_users_auth_' && !collectionIdMap.has(refName)) return false;
        return true;
      })
      .map(field => {
        const fieldDef = buildField(field);
        
        // Resolve collection ID for relations
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

    // Add autodate fields (created and updated)
    const allFields = [...fields, ...buildAutodateFields()];

    // Create without rules first (to avoid circular dependency issues)
    const collectionData: Record<string, unknown> = {
      name: collection.name,
      type: collection.type,
      fields: allFields,
      // Empty rules for now
      listRule: null,
      viewRule: null,
      createRule: null,
      updateRule: null,
      deleteRule: null,
    };

    // Don't add indexes yet - they might reference fields we haven't added
    // if (collection.indexes) {
    //   collectionData.indexes = collection.indexes;
    // }

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
      console.log(`   ✅ Created "${collection.name}" (id: ${created.id})`);
    } else {
      const error = await response.text();
      console.log(`   ❌ Failed to create "${collection.name}": ${error}`);
    }
  }

  // PHASE 2: Update rules and fix relation IDs
  console.log('\n🔧 Phase 2: Updating rules and relations...\n');

  for (const collection of orderedCollections) {
    if (collection.name === 'users') {
      // Update users rules
      console.log(`📝 Updating users rules...`);
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
        console.log('   ✅ Users rules updated');
      } else {
        const error = await updateResponse.text();
        console.log(`   ⚠️  Could not update users rules: ${error}`);
      }
      continue;
    }

    const collectionId = collectionIdMap.get(collection.name);
    if (!collectionId) {
      console.log(`⏭️  Skipping "${collection.name}" (no ID found)`);
      continue;
    }

    console.log(`📝 Updating "${collection.name}" rules and relations...`);

    // Build fields with resolved collection IDs
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

    // Add autodate fields (created and updated)
    const allFields = [...fields, ...buildAutodateFields()];

    const updateData: Record<string, unknown> = {
      fields: allFields,
      listRule: collection.listRule,
      viewRule: collection.viewRule,
      createRule: collection.createRule,
      updateRule: collection.updateRule,
      deleteRule: collection.deleteRule,
    };

    // Add indexes if defined
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
      console.log(`   ✅ Updated "${collection.name}"`);
    } else {
      const error = await response.text();
      console.log(`   ⚠️  Could not update "${collection.name}": ${error}`);
    }
  }

  console.log('\n✅ Schema import complete!\n');
}

main().catch(console.error);
