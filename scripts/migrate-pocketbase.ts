#!/usr/bin/env npx tsx
/**
 * PocketBase Migration Script for CI/CD
 * 
 * This script applies the PocketBase schema from pb_schema.json to a running
 * PocketBase instance. It's designed for CI/CD pipelines and automated deployments.
 * 
 * Usage:
 *   npx tsx scripts/migrate-pocketbase.ts
 * 
 * Environment Variables:
 *   POCKETBASE_URL     - PocketBase server URL (default: http://127.0.0.1:8090)
 *   PB_ADMIN_EMAIL     - Admin email for authentication
 *   PB_ADMIN_PASSWORD  - Admin password for authentication
 * 
 * Exit Codes:
 *   0 - Success
 *   1 - Connection error or authentication failure
 *   2 - Schema import error
 */

import PocketBase from 'pocketbase';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const POCKETBASE_URL = process.env.POCKETBASE_URL || 'http://127.0.0.1:8090';
const SCHEMA_PATH = join(__dirname, '../docker/pocketbase/pb_schema.json');

interface CollectionSchema {
  name: string;
  type: 'base' | 'auth';
  schema: SchemaField[];
  indexes?: string[];
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

interface MigrationResult {
  created: string[];
  updated: string[];
  skipped: string[];
  errors: { collection: string; error: string }[];
}

async function loadSchema(): Promise<CollectionSchema[]> {
  try {
    const schemaContent = readFileSync(SCHEMA_PATH, 'utf-8');
    return JSON.parse(schemaContent);
  } catch (error) {
    console.error(`❌ Failed to load schema from ${SCHEMA_PATH}`);
    console.error(`   Error: ${(error as Error).message}`);
    process.exit(2);
  }
}

async function waitForPocketBase(pb: PocketBase, maxRetries = 30, delayMs = 1000): Promise<boolean> {
  console.log(`⏳ Waiting for PocketBase at ${POCKETBASE_URL}...`);
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      await pb.health.check();
      console.log('✅ PocketBase is ready\n');
      return true;
    } catch {
      if (i < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }
  }
  
  return false;
}

async function migrateCollection(
  pb: PocketBase,
  collection: CollectionSchema,
  existingCollections: Map<string, { id: string; schema: SchemaField[] }>
): Promise<'created' | 'updated' | 'skipped' | 'error'> {
  const existing = existingCollections.get(collection.name);
  
  try {
    if (existing) {
      // Collection exists - check if update is needed
      const needsUpdate = JSON.stringify(existing.schema) !== JSON.stringify(collection.schema);
      
      if (needsUpdate) {
        await pb.collections.update(existing.id, {
          schema: collection.schema,
          indexes: collection.indexes,
          listRule: collection.listRule,
          viewRule: collection.viewRule,
          createRule: collection.createRule,
          updateRule: collection.updateRule,
          deleteRule: collection.deleteRule,
          options: collection.options,
        });
        return 'updated';
      }
      return 'skipped';
    } else {
      // Collection doesn't exist - create it
      await pb.collections.create(collection);
      return 'created';
    }
  } catch {
    return 'error';
  }
}

async function runMigration(): Promise<void> {
  console.log('\n🚀 PocketBase Migration Script\n');
  console.log(`   Schema: ${SCHEMA_PATH}`);
  console.log(`   Target: ${POCKETBASE_URL}\n`);

  const pb = new PocketBase(POCKETBASE_URL);

  // Wait for PocketBase to be ready (useful in CI/CD where services start in parallel)
  const isReady = await waitForPocketBase(pb);
  if (!isReady) {
    console.error('❌ PocketBase is not responding. Make sure it is running.');
    process.exit(1);
  }

  // Check for admin credentials
  const adminEmail = process.env.PB_ADMIN_EMAIL;
  const adminPassword = process.env.PB_ADMIN_PASSWORD;

  if (!adminEmail || !adminPassword) {
    console.error('❌ Admin credentials required for migration.');
    console.error('   Set PB_ADMIN_EMAIL and PB_ADMIN_PASSWORD environment variables.');
    process.exit(1);
  }

  // Authenticate as admin
  try {
    await pb.admins.authWithPassword(adminEmail, adminPassword);
    console.log('✅ Authenticated as admin\n');
  } catch (error) {
    console.error('❌ Admin authentication failed:', (error as Error).message);
    process.exit(1);
  }

  // Load schema
  const schema = await loadSchema();
  console.log(`📋 Loaded ${schema.length} collections from schema\n`);

  // Get existing collections
  const existingCollections = new Map<string, { id: string; schema: SchemaField[] }>();
  try {
    const collections = await pb.collections.getFullList();
    for (const col of collections) {
      existingCollections.set(col.name, { 
        id: col.id, 
        schema: col.schema as SchemaField[] 
      });
    }
  } catch (error) {
    console.error('❌ Failed to fetch existing collections:', (error as Error).message);
    process.exit(2);
  }

  // Run migrations
  const result: MigrationResult = {
    created: [],
    updated: [],
    skipped: [],
    errors: [],
  };

  // First pass: Create/update collections without relations
  // Second pass: Update relations (to handle circular dependencies)
  const collectionsWithRelations: CollectionSchema[] = [];
  const collectionsWithoutRelations: CollectionSchema[] = [];

  for (const collection of schema) {
    const hasRelations = collection.schema.some(field => field.type === 'relation');
    if (hasRelations) {
      collectionsWithRelations.push(collection);
    } else {
      collectionsWithoutRelations.push(collection);
    }
  }

  // Process collections without relations first
  console.log('📝 Processing collections...\n');
  
  for (const collection of [...collectionsWithoutRelations, ...collectionsWithRelations]) {
    process.stdout.write(`   ${collection.name}... `);
    
    const status = await migrateCollection(pb, collection, existingCollections);
    
    switch (status) {
      case 'created':
        result.created.push(collection.name);
        console.log('✅ created');
        // Add to existing collections for subsequent relation updates
        try {
          const newCol = await pb.collections.getOne(collection.name);
          existingCollections.set(collection.name, { 
            id: newCol.id, 
            schema: newCol.schema as SchemaField[] 
          });
        } catch {
          // Ignore - collection was just created
        }
        break;
      case 'updated':
        result.updated.push(collection.name);
        console.log('🔄 updated');
        break;
      case 'skipped':
        result.skipped.push(collection.name);
        console.log('⏭️  skipped (no changes)');
        break;
      case 'error':
        result.errors.push({ collection: collection.name, error: 'Migration failed' });
        console.log('❌ error');
        break;
    }
  }

  // Print summary
  console.log('\n📊 Migration Summary\n');
  console.log(`   Created: ${result.created.length}`);
  if (result.created.length > 0) {
    console.log(`            ${result.created.join(', ')}`);
  }
  console.log(`   Updated: ${result.updated.length}`);
  if (result.updated.length > 0) {
    console.log(`            ${result.updated.join(', ')}`);
  }
  console.log(`   Skipped: ${result.skipped.length}`);
  console.log(`   Errors:  ${result.errors.length}`);
  if (result.errors.length > 0) {
    for (const err of result.errors) {
      console.log(`            ${err.collection}: ${err.error}`);
    }
  }

  // Exit with appropriate code
  if (result.errors.length > 0) {
    console.log('\n❌ Migration completed with errors\n');
    process.exit(2);
  } else {
    console.log('\n✅ Migration completed successfully\n');
    process.exit(0);
  }
}

// Run migration
runMigration().catch((error) => {
  console.error('❌ Unexpected error:', error);
  process.exit(1);
});
