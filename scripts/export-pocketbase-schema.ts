#!/usr/bin/env npx tsx
/**
 * PocketBase Schema Export Script
 * 
 * This script exports the current PocketBase schema to pb_schema.json for version control.
 * Use this after making changes via the PocketBase Admin UI to keep the schema file in sync.
 * 
 * Usage:
 *   npx tsx scripts/export-pocketbase-schema.ts
 * 
 * Environment Variables:
 *   POCKETBASE_URL     - PocketBase server URL (default: http://127.0.0.1:8090)
 *   PB_ADMIN_EMAIL     - Admin email for authentication
 *   PB_ADMIN_PASSWORD  - Admin password for authentication
 */

import PocketBase from 'pocketbase';
import { writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const POCKETBASE_URL = process.env.POCKETBASE_URL || 'http://127.0.0.1:8090';
const SCHEMA_PATH = join(__dirname, '../docker/pocketbase/pb_schema.json');

// Collections to export (excluding system collections)
const COLLECTIONS_TO_EXPORT = [
  'users',
  'workspaces',
  'blueprints',
  'items',
  'collaborators',
  'instances',
  'instanceItems',
  'notifications',
  'activityLog',
];

interface ExportedCollection {
  name: string;
  type: string;
  schema: unknown[];
  indexes?: string[];
  options?: Record<string, unknown>;
  listRule?: string | null;
  viewRule?: string | null;
  createRule?: string | null;
  updateRule?: string | null;
  deleteRule?: string | null;
}

async function exportSchema(): Promise<void> {
  console.log('\n📤 PocketBase Schema Export\n');
  console.log(`   Source: ${POCKETBASE_URL}`);
  console.log(`   Output: ${SCHEMA_PATH}\n`);

  const pb = new PocketBase(POCKETBASE_URL);

  // Check if PocketBase is running
  try {
    await pb.health.check();
    console.log('✅ PocketBase is running\n');
  } catch {
    console.error('❌ Cannot connect to PocketBase. Make sure it is running.');
    process.exit(1);
  }

  // Check for admin credentials
  const adminEmail = process.env.PB_ADMIN_EMAIL;
  const adminPassword = process.env.PB_ADMIN_PASSWORD;

  if (!adminEmail || !adminPassword) {
    console.error('❌ Admin credentials required for export.');
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

  // Fetch all collections
  const exportedCollections: ExportedCollection[] = [];
  
  console.log('📋 Exporting collections...\n');

  for (const collectionName of COLLECTIONS_TO_EXPORT) {
    process.stdout.write(`   ${collectionName}... `);
    
    try {
      const collection = await pb.collections.getOne(collectionName);
      
      const exported: ExportedCollection = {
        name: collection.name,
        type: collection.type,
        schema: collection.schema,
        listRule: collection.listRule,
        viewRule: collection.viewRule,
        createRule: collection.createRule,
        updateRule: collection.updateRule,
        deleteRule: collection.deleteRule,
      };

      // Include indexes if present
      if (collection.indexes && collection.indexes.length > 0) {
        exported.indexes = collection.indexes;
      }

      // Include options for auth collections
      if (collection.type === 'auth' && collection.options) {
        exported.options = collection.options;
      }

      exportedCollections.push(exported);
      console.log('✅');
    } catch {
      console.log('⚠️  not found');
    }
  }

  // Write schema to file
  try {
    const schemaJson = JSON.stringify(exportedCollections, null, 2);
    writeFileSync(SCHEMA_PATH, schemaJson + '\n');
    console.log(`\n✅ Schema exported to ${SCHEMA_PATH}`);
    console.log(`   Exported ${exportedCollections.length} collections\n`);
  } catch (error) {
    console.error('\n❌ Failed to write schema file:', (error as Error).message);
    process.exit(1);
  }
}

// Run export
exportSchema().catch((error) => {
  console.error('❌ Unexpected error:', error);
  process.exit(1);
});
