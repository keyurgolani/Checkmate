/**
 * CHECKMATE-01.1 · adapter (#29): `Collections` derives from the adapter and
 * keeps its values, every name the adapter maps holds in all three install
 * variants, read from pb_schema.json and the two setup scripts, and the other
 * contract files name the same stored collections. records.test.ts covers the
 * round trip.
 */
import { describe, expect, it } from 'vitest';
import * as pocketbaseTypes from '@/lib/pocketbase-types';
import { readInstallVariant, type VariantSchema } from '@/test/install-variants';
import { AGGREGATES } from './lifecycles';
import { COLLECTIONS, RELATIONS } from './retention';
import {
  ACTIVITY_RESOURCE_TYPES,
  Collections,
  INSTALL_VARIANTS,
  LEGACY_COLLECTION_KEYS,
  LEGACY_COLLECTION_NAMES,
  LEGACY_FIELD_NAMES,
  NOTIFICATION_TYPES,
  SCHEMA_SOURCES,
  SELECT_FIELDS,
  STORAGE_COLLECTIONS,
  STORAGE_FIELDS,
  STORAGE_NAMES,
  canonicalValue,
  storageField,
  type CollectionKey,
  type InstallVariant,
  type SelectField,
} from './storage';
import { TERMS, findTerm } from './vocabulary';

const VARIANTS: ReadonlyArray<readonly [InstallVariant, VariantSchema]> = INSTALL_VARIANTS.map((variant) => [variant, readInstallVariant(variant)]);
const STORED: ReadonlySet<string> = new Set(Object.values(STORAGE_COLLECTIONS));

function constantCase(name: string): string {
  return name.replace(/([a-z])([A-Z])/g, '$1_$2').toUpperCase();
}

/** The stored values a variant's select accepts, per the adapter. */
function valuesIn(select: SelectField, variant: InstallVariant): string[] {
  return Object.values(select.values)
    .filter((stored) => select.valuePresentIn?.[stored]?.includes(variant) ?? true)
    .sort();
}

describe('Collections', () => {
  it('keeps the value of every key services use', () => {
    expect(Collections).toMatchObject({
      USERS: 'users',
      WORKSPACES: 'workspaces',
      TEMPLATES: 'blueprints',
      ITEMS: 'items',
      COLLABORATORS: 'collaborators',
      CHECKLISTS: 'instances',
      CHECKLIST_ITEMS: 'instanceItems',
      NOTIFICATIONS: 'notifications',
      ACTIVITY_LOG: 'activityLog',
    });
  });

  it("equals the adapter's collection map: one key per canonical collection, plus the three legacy keys", () => {
    const canonical = Object.fromEntries(Object.entries(STORAGE_COLLECTIONS).map(([key, storage]) => [constantCase(key), storage]));
    const legacy = Object.fromEntries(Object.entries(LEGACY_COLLECTION_KEYS).map(([key, collection]) => [key, STORAGE_COLLECTIONS[collection]]));

    expect(Collections).toEqual({ ...canonical, ...legacy });
    expect(Object.keys(canonical).filter((key) => key in LEGACY_COLLECTION_KEYS)).toEqual([]);
  });

  it('is the object pocketbase-types.ts exports', () => {
    expect(pocketbaseTypes.Collections).toBe(Collections);
  });
});

describe('install variants', () => {
  it("spells sources like #31's presentIn", () => {
    expect(SCHEMA_SOURCES).toEqual(['pb_schema', 'setup-pocketbase', 'create-collections', 'schema-init', 'code-only']);
    expect(INSTALL_VARIANTS).toEqual(['pb_schema', 'setup-pocketbase', 'create-collections']);
  });

  it.each(VARIANTS)('%s has exactly the collections the adapter maps', (_variant, schema) => {
    expect([...schema.keys()].sort()).toEqual(Object.values(STORAGE_COLLECTIONS).sort());
  });

  it.each(VARIANTS)('%s has each renamed field as a relation on its collection', (_variant, schema) => {
    const fields = Object.entries(STORAGE_FIELDS).flatMap(([collection, renames]) =>
      Object.values(renames).map((stored) => [STORAGE_COLLECTIONS[collection as CollectionKey], stored] as const),
    );

    expect(fields.map(([collection, stored]) => `${collection}.${stored} ${schema.get(collection)?.get(stored)?.type}`)).toEqual(
      fields.map(([collection, stored]) => `${collection}.${stored} relation`),
    );
  });

  it.each(VARIANTS)('%s accepts exactly the stored values the adapter maps for each select', (variant, schema) => {
    for (const [name, select] of Object.entries(SELECT_FIELDS) as Array<[string, SelectField]>) {
      const field = schema.get(STORAGE_COLLECTIONS[select.collection])?.get(select.field);
      if (select.presentIn && !select.presentIn.includes(variant)) {
        expect(field, `${name} is not in ${variant}`).toBeUndefined();
      } else {
        expect(field?.type, name).toBe('select');
        expect([...(field?.values ?? [])].sort(), `${name} in ${variant}`).toEqual(valuesIn(select, variant));
      }
    }
  });
});

describe('the other contract files', () => {
  it('name the same stored collections for the terms the adapter maps', () => {
    const expected: Readonly<Record<string, CollectionKey>> = {
      Account: 'users',
      Workspace: 'workspaces',
      Template: 'templates',
      'Template Draft': 'templates',
      'Step Definition': 'templateSteps',
      Module: 'templates',
      Run: 'runs',
      'Run Step': 'runSteps',
      Grant: 'collaborators',
      Notification: 'notifications',
    };

    for (const [term, collection] of Object.entries(expected)) expect(findTerm(term)?.storage.name, term).toBe(STORAGE_COLLECTIONS[collection]);
  });

  it('cite only stored collections in baseline storage, retention and aggregates', () => {
    const vocabulary = TERMS.filter((term) => term.storage.status === 'baseline').map((term) => (term.storage.name ?? '').split('.')[0] ?? '');
    const retention = COLLECTIONS.filter((row) => row.status === 'baseline').map((row) => row.collection);
    const relations = RELATIONS.filter((row) => row.baseline !== 'planned' && row.baseline !== 'new').flatMap((row) => [row.relation.split('.')[0] ?? '', row.references]);

    const draft = AGGREGATES.find((aggregate) => aggregate.name === 'Template Draft');
    const run = AGGREGATES.find((aggregate) => aggregate.name === 'Run');

    expect(vocabulary.filter((name) => !STORED.has(name))).toEqual([]);
    expect([...retention].sort()).toEqual([...STORED].sort());
    expect(relations.filter((name) => !STORED.has(name))).toEqual([]);
    expect(draft?.root).toBe(STORAGE_COLLECTIONS.templates);
    expect(draft?.members).toContain(STORAGE_COLLECTIONS.templateSteps);
    expect(run?.root).toBe(STORAGE_COLLECTIONS.runs);
    expect(run?.members).toEqual([STORAGE_COLLECTIONS.runs, STORAGE_COLLECTIONS.runSteps]);
  });
});

describe('names', () => {
  it('maps the canonical notification types to their stored values', () => {
    expect(NOTIFICATION_TYPES.template_updated).toBe('blueprint_updated');
    expect(NOTIFICATION_TYPES.run_reminder).toBe('instance_reminder');
    expect(Object.values(NOTIFICATION_TYPES).sort()).toEqual(Object.values(pocketbaseTypes.NotificationType).sort());
  });

  it('maps every activity resource type to a value the select accepts', () => {
    expect(ACTIVITY_RESOURCE_TYPES).toEqual({
      template: 'blueprint',
      templateStep: 'item',
      run: 'instance',
      runStep: 'instanceItem',
      collaborator: 'collaborator',
      workspace: 'workspace',
    });
    // The code's ResourceType values the select rejects have no stored meaning.
    expect(['template', 'checklist', 'checklistItem'].map((value) => canonicalValue(ACTIVITY_RESOURCE_TYPES, value))).toEqual([
      undefined,
      undefined,
      undefined,
    ]);
  });

  it('renames only relation fields, and only these', () => {
    expect(STORAGE_FIELDS).toEqual({
      templateSteps: { template: 'blueprint' },
      collaborators: { template: 'blueprint' },
      runs: { template: 'blueprint' },
      runSteps: { run: 'instance', sourceStep: 'sourceItem' },
    });
    expect(storageField('runSteps', 'sourceStep')).toBe('sourceItem');
    expect(storageField('runSteps', 'parent')).toBe('parent');
    expect(storageField('templates', 'title')).toBe('title');
  });

  it('lists every storage name once, with its map ID, and marks exactly the legacy ones', () => {
    expect(new Set(STORAGE_NAMES.map((name) => name.mapId)).size).toBe(STORAGE_NAMES.length);
    expect(STORAGE_NAMES.filter((name) => name.rename).map((name) => name.mapId)).toEqual([
      'MAP:blueprints',
      'MAP:items',
      'MAP:instances',
      'MAP:instanceItems',
      'MAP:items.blueprint',
      'MAP:collaborators.blueprint',
      'MAP:instances.blueprint',
      'MAP:instanceItems.instance',
      'MAP:instanceItems.sourceItem',
      'MAP:enum:notifications.type.blueprint_updated',
      'MAP:enum:notifications.type.instance_reminder',
      'MAP:enum:activityLog.resourceType.blueprint',
      'MAP:enum:activityLog.resourceType.item',
      'MAP:enum:activityLog.resourceType.instance',
      'MAP:enum:activityLog.resourceType.instanceItem',
    ]);
    expect(LEGACY_FIELD_NAMES).toEqual(['blueprint', 'instance', 'sourceItem']);
    expect(LEGACY_COLLECTION_NAMES).toEqual(['blueprints', 'instanceItems', 'instances', 'items']);
  });

  it('says where each name only some variants have is present', () => {
    const only = STORAGE_NAMES.filter((name) => name.presentIn.join() !== INSTALL_VARIANTS.join()).map(
      (name) => `${name.path} ${name.presentIn.join(',')}`,
    );

    expect(only).toEqual([
      'items.itemType.phase pb_schema',
      'instanceItems.itemType.task pb_schema',
      'instanceItems.itemType.reference pb_schema',
      'instanceItems.itemType.phase pb_schema',
      'notifications.type.access_request pb_schema',
    ]);
    expect(STORAGE_NAMES.flatMap((name) => name.presentIn).filter((source) => !SCHEMA_SOURCES.includes(source))).toEqual([]);
  });

  it('reads back each stored value as one canonical value', () => {
    for (const select of Object.values(SELECT_FIELDS) as SelectField[]) {
      const stored = Object.values(select.values);
      expect(new Set(stored).size, select.field).toBe(stored.length);
      for (const [canonical, value] of Object.entries(select.values)) expect(canonicalValue(select.values, value)).toBe(canonical);
    }
    expect(canonicalValue(NOTIFICATION_TYPES, 'mention')).toBeUndefined();
    expect(canonicalValue(NOTIFICATION_TYPES, 7)).toBeUndefined();
  });
});
