/**
 * CHECKMATE-01.1 · adapter (#29), test plan item 6 and #3 test 3: a
 * representative legacy record of each type round-trips through records.ts
 * with no field lost, every notification type included. The fixtures are
 * typed with pocketbase-types.ts, so each carries every field the code reads
 * today. Also: unknown select values read as `unknown` and never write back,
 * and a field is optional exactly when some install variant lacks it. An
 * optional field set to `undefined` counts as absent.
 */
import * as fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import {
  ActivityAction,
  ItemType,
  NotificationType,
  ResourceType,
  Visibility,
  type ActivityLog,
  type Checklist,
  type ChecklistItem,
  type Item,
  type Notification,
  type Template,
} from '@/lib/pocketbase-types';
import { readInstallVariant } from '@/test/install-variants';
import { RECORD_SHAPES, UNKNOWN_VALUE, fromStorage, toStorage, type RecordKind } from './records';
import { INSTALL_VARIANTS, STORAGE_COLLECTIONS, storageField, type SchemaSource, type SelectField } from './storage';

const CREATED = '2026-10-01 09:15:00.000Z';
const UPDATED = '2026-10-02 17:40:12.345Z';

const template: Template = {
  id: 'tmpl1a2b3c4d5e6',
  collectionId: 'pbc_3022218392',
  collectionName: 'blueprints',
  created: CREATED,
  updated: UPDATED,
  workspace: 'wksp1a2b3c4d5e6',
  owner: 'user1a2b3c4d5e6',
  title: 'Store opening',
  description: '<p>Open the store before 9.</p>',
  visibility: Visibility.SHARED,
  category: 'Retail',
  tags: ['opening', 'daily'],
  version: 1,
  instanceCount: 4,
  ratingSum: 0,
  ratingCount: 0,
  questions: [{ id: 'weekend', question: 'Is it a weekend?', answerType: 'boolean', defaultValue: false }],
  resources: [{ title: 'Floor plan', url: 'https://example.com/floor-plan', description: 'Ground floor' }],
  expand: { owner: undefined },
};

const templateStep: Item = {
  id: 'item1a2b3c4d5e6',
  collectionId: 'pbc_2049338183',
  collectionName: 'items',
  created: CREATED,
  updated: UPDATED,
  blueprint: template.id,
  parent: 'item0a0b0c0d0e0',
  path: '1.2',
  itemType: ItemType.TASK,
  content: 'Unlock the front door',
  description: null,
  resources: null,
  reference: null,
  position: 2,
  metadata: { priority: 'high', conditions: [{ questionId: 'weekend', operator: 'equals', value: false }] },
  expand: { blueprint: template },
};

const run: Checklist = {
  id: 'inst1a2b3c4d5e6',
  collectionId: 'pbc_1855012311',
  collectionName: 'instances',
  created: CREATED,
  updated: UPDATED,
  blueprint: template.id,
  user: 'user1a2b3c4d5e6',
  workspace: 'wksp1a2b3c4d5e6',
  name: 'Store opening, Monday',
  progress: 50,
  completedAt: null,
  description: null,
  resources: [],
  expand: { blueprint: template },
};

const runStep: ChecklistItem = {
  id: 'step1a2b3c4d5e6',
  collectionId: 'pbc_4209831042',
  collectionName: 'instanceItems',
  created: CREATED,
  updated: UPDATED,
  instance: run.id,
  sourceItem: templateStep.id,
  parent: null,
  path: '1.2',
  content: 'Unlock the front door',
  description: null,
  resources: null,
  isCompleted: true,
  completedAt: UPDATED,
  isCustom: false,
  position: 2,
  itemType: ItemType.TASK,
  expand: { instance: run },
};

function notification(type: NotificationType): Notification {
  return {
    id: 'ntfy1a2b3c4d5e6',
    collectionId: 'pbc_2301922722',
    collectionName: 'notifications',
    created: CREATED,
    updated: UPDATED,
    user: 'user1a2b3c4d5e6',
    type,
    title: `A ${type} notification`,
    message: null,
    data: { templateId: template.id, templateTitle: template.title },
    isRead: false,
  };
}

function activityEntry(resourceType: string, action: ActivityAction = ActivityAction.UPDATE): ActivityLog {
  return {
    id: 'actv1a2b3c4d5e6',
    collectionId: 'pbc_1295301207',
    collectionName: 'activityLog',
    created: CREATED,
    updated: UPDATED,
    user: 'user1a2b3c4d5e6',
    // The select stores the adapter's values, which ResourceType doesn't list.
    resourceType: resourceType as ResourceType,
    resourceId: template.id,
    action,
    metadata: { previousValue: 'Old title', newValue: 'Store opening' },
  };
}

/** A row as stored: the response metadata dropped. */
function stored<T extends object>(row: T): Omit<T, 'collectionId' | 'collectionName' | 'expand'> {
  const copy = { ...row } as Record<string, unknown>;
  delete copy.collectionId;
  delete copy.collectionName;
  delete copy.expand;
  return copy as Omit<T, 'collectionId' | 'collectionName' | 'expand'>;
}

describe('round trip', () => {
  it('keeps every field of a template, renaming none', () => {
    const record = fromStorage('template', template);

    expect(record).toEqual(stored(template));
    expect(toStorage('template', record)).toEqual(stored(template));
  });

  it('reads a template step under canonical names and writes it back unchanged', () => {
    const record = fromStorage('templateStep', templateStep);
    const { blueprint, ...rest } = stored(templateStep);

    expect(record).toEqual({ ...rest, template: blueprint });
    expect(toStorage('templateStep', record)).toEqual(stored(templateStep));
  });

  it('reads a run under canonical names and writes it back unchanged', () => {
    const record = fromStorage('run', run);
    const { blueprint, ...rest } = stored(run);

    expect(record).toEqual({ ...rest, template: blueprint });
    expect(toStorage('run', record)).toEqual(stored(run));
  });

  it('reads a run step under canonical names and writes it back unchanged', () => {
    const record = fromStorage('runStep', runStep);
    const { instance, sourceItem, ...rest } = stored(runStep);

    expect(record).toEqual({ ...rest, run: instance, sourceStep: sourceItem });
    expect(toStorage('runStep', record)).toEqual(stored(runStep));
  });

  it.each(Object.values(NotificationType))('round-trips a %s notification', (type) => {
    const legacy = notification(type);

    expect(toStorage('notification', fromStorage('notification', legacy))).toEqual(stored(legacy));
  });

  it('reads the legacy notification types under their canonical names', () => {
    expect(fromStorage('notification', notification(NotificationType.BLUEPRINT_UPDATED)).type).toBe('template_updated');
    expect(fromStorage('notification', notification(NotificationType.INSTANCE_REMINDER)).type).toBe('run_reminder');
    expect(fromStorage('notification', notification(NotificationType.SYSTEM)).type).toBe('system');
    expect(toStorage('notification', { ...fromStorage('notification', notification(NotificationType.SYSTEM)), type: 'run_reminder' }).type).toBe(
      'instance_reminder',
    );
  });

  it.each([
    ['blueprint', 'template'],
    ['item', 'templateStep'],
    ['instance', 'run'],
    ['instanceItem', 'runStep'],
    ['collaborator', 'collaborator'],
    ['workspace', 'workspace'],
  ])('round-trips an activity entry on a %s as %s', (storedType, canonical) => {
    const legacy = activityEntry(storedType);
    const record = fromStorage('activityEntry', legacy);

    expect(record.resourceType).toBe(canonical);
    expect(toStorage('activityEntry', record)).toEqual(stored(legacy));
  });

  it.each(Object.values(ActivityAction))('round-trips the %s activity action', (action) => {
    const legacy = activityEntry('blueprint', action);

    expect(toStorage('activityEntry', fromStorage('activityEntry', legacy))).toEqual(stored(legacy));
  });

  it('keeps a field that only some install variants have absent when the row lacks it', () => {
    const fromScript = stored(template) as Partial<Template>;
    delete fromScript.questions;
    const record = fromStorage('template', fromScript as Template);

    expect('questions' in record).toBe(false);
    expect(toStorage('template', record)).toEqual(fromScript);
  });
});

describe('select values', () => {
  it('reads a value the adapter does not know as unknown', () => {
    expect(fromStorage('template', { ...template, visibility: 'unlisted' as Visibility }).visibility).toBe(UNKNOWN_VALUE);
    expect(fromStorage('templateStep', { ...templateStep, itemType: 'checkbox' as ItemType }).itemType).toBe(UNKNOWN_VALUE);
    expect(fromStorage('notification', { ...notification(NotificationType.SYSTEM), type: 'mention' as NotificationType }).type).toBe(UNKNOWN_VALUE);
    // `template` is the code's ResourceType value, which no install variant's select accepts.
    expect(fromStorage('activityEntry', activityEntry('template')).resourceType).toBe(UNKNOWN_VALUE);
    expect(fromStorage('activityEntry', activityEntry('blueprint', 'archive' as ActivityAction)).action).toBe(UNKNOWN_VALUE);
  });

  it('refuses to write unknown back', () => {
    const record = fromStorage('notification', { ...notification(NotificationType.SYSTEM), type: 'mention' as NotificationType });

    expect(() => toStorage('notification', record)).toThrow(RangeError);
    expect(() => toStorage('activityEntry', fromStorage('activityEntry', activityEntry('template')))).toThrow(/resourceType "unknown"/);
  });

  it("reads an empty run step item type as null, and writes null back", () => {
    for (const empty of ['', null]) {
      const record = fromStorage('runStep', { ...runStep, itemType: empty as ItemType | null });
      expect(record.itemType, String(empty)).toBeNull();
      expect(toStorage('runStep', record).itemType).toBeNull();
    }
    const fromScript = stored(runStep) as Partial<ChecklistItem>;
    delete fromScript.itemType;
    expect('itemType' in fromStorage('runStep', fromScript as ChecklistItem)).toBe(false);
  });

  it('treats an optional field set to undefined as absent, both ways', () => {
    const record = fromStorage('runStep', runStep);
    const written = toStorage('runStep', { ...record, itemType: undefined, resources: undefined });
    const read = fromStorage('runStep', { ...runStep, itemType: undefined } as unknown as ChecklistItem);

    expect('itemType' in written).toBe(false);
    expect('resources' in written).toBe(false);
    expect('itemType' in read).toBe(false);
    expect(() => toStorage('run', { ...fromStorage('run', run), template: undefined } as never)).toThrow(/record has no template field/);
  });
});

describe('guards', () => {
  it('refuses a row from another collection', () => {
    expect(() => fromStorage('template', run as unknown as Template)).toThrow(/reads blueprints rows, not instances/);
    expect(() => fromStorage('runStep', templateStep as unknown as ChecklistItem)).toThrow(/reads instanceItems rows/);
  });

  it('refuses a row or record without a field every install variant has', () => {
    const partial = stored(run) as Partial<Checklist>;
    delete partial.progress;

    expect(() => fromStorage('run', partial as Checklist)).toThrow(/instances row has no progress field/);
    const record: Record<string, unknown> = { ...fromStorage('run', run) };
    delete record.template;
    expect(() => toStorage('run', record as never)).toThrow(/record has no template field/);
  });
});

describe('every row', () => {
  const json = fc.oneof(fc.string(), fc.integer(), fc.boolean(), fc.constant(null), fc.array(fc.string(), { maxLength: 3 }));

  function rowArbitrary(kind: RecordKind): fc.Arbitrary<Record<string, unknown>> {
    const shape = RECORD_SHAPES[kind];
    const model: Record<string, fc.Arbitrary<unknown>> = {};
    for (const field of shape.fields) {
      const select = (shape.selects as Readonly<Record<string, SelectField>>)[field];
      const nullable = (shape.nullable as readonly string[]).includes(field);
      const values = select ? fc.constantFrom(...Object.values(select.values)) : json;
      model[storageField(shape.collection, field)] = nullable ? fc.option(values, { nil: null }) : values;
    }
    const optional = new Set(Object.keys(shape.optional));
    const required = shape.fields.filter((field) => !optional.has(field)).map((field) => storageField(shape.collection, field));
    return fc.record(model, { requiredKeys: required });
  }

  it.each(Object.keys(RECORD_SHAPES) as RecordKind[])('round-trips any stored %s row with known select values', (kind) => {
    fc.assert(
      fc.property(rowArbitrary(kind), (row) => {
        expect(toStorage(kind, fromStorage(kind, row as never))).toEqual(row);
      }),
    );
  });
});

describe('install variants', () => {
  const schemas = INSTALL_VARIANTS.map((variant) => [variant, readInstallVariant(variant)] as const);

  it.each(Object.keys(RECORD_SHAPES) as RecordKind[])(
    "makes a %s field optional exactly when some install variant lacks it, and gives the variants that have it",
    (kind) => {
      const shape = RECORD_SHAPES[kind];
      const optional: Readonly<Record<string, readonly SchemaSource[]>> = shape.optional;
      const collection = STORAGE_COLLECTIONS[shape.collection];
      const wrong = shape.fields.flatMap((field) => {
        const stored = storageField(shape.collection, field);
        const declared = schemas.filter(([, schema]) => schema.get(collection)?.has(stored)).map(([variant]) => variant);
        const presentIn = optional[field];
        if (presentIn === undefined) return declared.length === INSTALL_VARIANTS.length ? [] : [`${collection}.${stored} is required but only in ${declared.join(', ')}`];
        // A field no variant declares is one only the app writes (#31's code-only writes).
        const expected: readonly SchemaSource[] = declared.length === 0 ? ['code-only'] : declared;
        return declared.length < INSTALL_VARIANTS.length && presentIn.join() === expected.join()
          ? []
          : [`${collection}.${stored} is present in ${presentIn.join(', ')}, but declared in ${declared.join(', ') || 'no variant'}`];
      });

      expect(wrong).toEqual([]);
    },
  );
});
