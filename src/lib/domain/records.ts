/**
 * CHECKMATE-01.1 · adapter (#29): typed records for the six legacy row types,
 * read and written through storage.ts.
 *
 * `fromStorage` maps a stored row to its record: renamed relation fields take
 * their canonical names (`blueprint` becomes `template`, `instance` becomes
 * `run`, `sourceItem` becomes `sourceStep`), and each select value becomes its
 * canonical value, or `unknown` when the adapter doesn't know it. `toStorage`
 * maps a record back, field for field, and refuses to write `unknown`.
 *
 * No record extends the SDK's `RecordModel` or has an index signature, so
 * reading a field a record doesn't have fails to compile
 * (records.typetest.ts). A field only some install variants have is optional
 * and stays absent when the row lacks it; a field set to `undefined` counts as
 * absent both ways. Response metadata (`collectionId`, `collectionName`,
 * `expand`) is not carried; read an expanded relation through its own record.
 * JSON fields keep their stored shape, typed by their declared keys; nothing
 * here validates them, and #31's map quarantines undeclared keys.
 *
 * No service reads these yet. #38 (04.1), #42 (05.2) and #47 (07.1) are the
 * first consumers.
 */
import {
  ROW_FIELDS,
  SELECT_FIELDS,
  STORAGE_COLLECTIONS,
  STORAGE_FIELDS,
  canonicalValue,
  storageField,
  type ActivityAction,
  type ActivityResourceType,
  type CollectionKey,
  type NotificationType,
  type SchemaSource,
  type SelectField,
  type StepItemType,
  type TemplateVisibility,
} from './storage';

/** A select value the adapter doesn't know, such as one from a newer schema or a hand-edited select. */
export const UNKNOWN_VALUE = 'unknown';
export type UnknownValue = typeof UNKNOWN_VALUE;

export interface ResourceLink {
  readonly title: string;
  readonly url: string;
  readonly description?: string;
}

/** `blueprints.questions`. 06.2 turns them into parameters. */
export interface StoredQuestion {
  readonly id: string;
  readonly question: string;
  readonly answerType: 'boolean' | 'enum';
  readonly enumOptions?: readonly string[];
  readonly defaultValue?: boolean | string;
}

/** One entry of `items.metadata.conditions`. 08.3 moves them into the parameter schema. */
export interface StoredCondition {
  readonly questionId: string;
  readonly operator: 'equals' | 'notEquals';
  readonly value: boolean | string;
}

/** `items.metadata`, by its declared keys. */
export interface StoredStepMetadata {
  readonly dueDate?: string;
  readonly priority?: 'low' | 'medium' | 'high';
  readonly notes?: string;
  readonly conditions?: readonly StoredCondition[];
}

/** `notifications.data`, by its declared keys. */
export interface StoredNotificationData {
  readonly templateId?: string;
  readonly templateTitle?: string;
  readonly collaboratorId?: string;
  readonly checklistId?: string;
}

/** `activityLog.metadata`, by its declared keys. */
export interface StoredActivityMetadata {
  readonly previousValue?: unknown;
  readonly newValue?: unknown;
  readonly itemId?: string;
  readonly collaboratorId?: string;
}

/** `ROW_FIELDS` in storage.ts: every row has them in every install variant. */
interface RowFields {
  readonly id: string;
  readonly created: string;
  readonly updated: string;
}

/** A `blueprints` row. */
export interface TemplateRecord extends RowFields {
  readonly workspace: string;
  readonly owner: string;
  readonly title: string;
  readonly description: string | null;
  readonly visibility: TemplateVisibility | UnknownValue;
  readonly category: string | null;
  readonly tags: readonly string[] | null;
  /** Always 1. 04.1 numbers revisions fresh and never reads it (#31 `untrusted-counters`). */
  readonly version: number;
  /** Not trusted, and 13.2 drops it, so it keeps its stored name. */
  readonly instanceCount: number;
  readonly ratingSum: number;
  readonly ratingCount: number;
  /** pb_schema installs only. */
  readonly questions?: readonly StoredQuestion[] | null;
  /** Only setup-pocketbase declares it, but the app writes it (#31). */
  readonly resources?: readonly ResourceLink[] | null;
}

/** An `items` row: one step of a template's draft. */
export interface TemplateStepRecord extends RowFields {
  /** Stored as `blueprint`. */
  readonly template: string;
  readonly parent: string | null;
  readonly path: string;
  /** 05.2 maps it to a kind key. */
  readonly itemType: StepItemType | UnknownValue;
  readonly content: string;
  /** The template a reference step points at. */
  readonly reference: string | null;
  readonly position: number;
  readonly metadata: StoredStepMetadata | null;
  /** pb_schema installs only. */
  readonly description?: string | null;
  /** pb_schema installs only. */
  readonly resources?: readonly ResourceLink[] | null;
}

/** An `instances` row. */
export interface RunRecord extends RowFields {
  /** Stored as `blueprint`. */
  readonly template: string;
  readonly user: string;
  readonly name: string;
  readonly progress: number;
  readonly completedAt: string | null;
  /** No install variant declares it, but the app writes it. 18.2 gate 1 adds it (`MAP:instances.workspace`). */
  readonly workspace?: string | null;
  /** Only setup-pocketbase declares it, but the app writes it. */
  readonly description?: string | null;
  /** Only setup-pocketbase declares it, but the app writes it. */
  readonly resources?: readonly ResourceLink[] | null;
}

/** An `instanceItems` row. */
export interface RunStepRecord extends RowFields {
  /** Stored as `instance`. */
  readonly run: string;
  /** Stored as `sourceItem`. Root steps have none (#31 `root-step-no-source`). */
  readonly sourceStep: string | null;
  readonly parent: string | null;
  readonly path: string;
  readonly content: string;
  readonly isCompleted: boolean;
  readonly completedAt: string | null;
  readonly isCustom: boolean;
  readonly position: number;
  /** pb_schema and setup-pocketbase installs. */
  readonly description?: string | null;
  /** pb_schema and setup-pocketbase installs. */
  readonly resources?: readonly ResourceLink[] | null;
  /** pb_schema installs only, and null when empty (#31 `step-no-kind`). */
  readonly itemType?: StepItemType | UnknownValue | null;
}

/** A `notifications` row. */
export interface NotificationRecord extends RowFields {
  readonly user: string;
  readonly type: NotificationType | UnknownValue;
  readonly title: string;
  readonly message: string | null;
  readonly data: StoredNotificationData | null;
  readonly isRead: boolean;
}

/** An `activityLog` row. 12.2 quarantines them all and never turns one into an audit entry (#31 `legacy-history`). */
export interface ActivityEntryRecord extends RowFields {
  readonly user: string;
  readonly resourceType: ActivityResourceType | UnknownValue;
  readonly resourceId: string;
  readonly action: ActivityAction | UnknownValue;
  readonly metadata: StoredActivityMetadata | null;
}

/** Each record type by kind. */
export interface Records {
  readonly template: TemplateRecord;
  readonly templateStep: TemplateStepRecord;
  readonly run: RunRecord;
  readonly runStep: RunStepRecord;
  readonly notification: NotificationRecord;
  readonly activityEntry: ActivityEntryRecord;
}

export type RecordKind = keyof Records;

interface RecordShape {
  readonly collection: CollectionKey;
  /** Every field of the record, by canonical name. */
  readonly fields: readonly string[];
  /** Fields that some install variants lack, or that only the app writes, with where each is declared. */
  readonly optional: Readonly<Record<string, readonly SchemaSource[]>>;
  /** Select fields, by canonical field name. */
  readonly selects: Readonly<Record<string, SelectField>>;
  /** Select fields that may be empty, which reads as null. */
  readonly nullable: readonly string[];
}

/** What each record reads. records.typetest.ts checks each list against its record type. */
export const RECORD_SHAPES = {
  template: {
    collection: 'templates',
    fields: [
      ...ROW_FIELDS,
      'workspace',
      'owner',
      'title',
      'description',
      'visibility',
      'category',
      'tags',
      'version',
      'instanceCount',
      'ratingSum',
      'ratingCount',
      'questions',
      'resources',
    ],
    optional: { questions: ['pb_schema'], resources: ['setup-pocketbase'] },
    selects: { visibility: SELECT_FIELDS.templateVisibility },
    nullable: [],
  },
  templateStep: {
    collection: 'templateSteps',
    fields: [
      ...ROW_FIELDS,
      'template',
      'parent',
      'path',
      'itemType',
      'content',
      'reference',
      'position',
      'metadata',
      'description',
      'resources',
    ],
    optional: { description: ['pb_schema'], resources: ['pb_schema'] },
    selects: { itemType: SELECT_FIELDS.templateStepItemType },
    nullable: [],
  },
  run: {
    collection: 'runs',
    fields: [...ROW_FIELDS, 'template', 'user', 'name', 'progress', 'completedAt', 'workspace', 'description', 'resources'],
    optional: { workspace: ['code-only'], description: ['setup-pocketbase'], resources: ['setup-pocketbase'] },
    selects: {},
    nullable: [],
  },
  runStep: {
    collection: 'runSteps',
    fields: [
      ...ROW_FIELDS,
      'run',
      'sourceStep',
      'parent',
      'path',
      'content',
      'isCompleted',
      'completedAt',
      'isCustom',
      'position',
      'description',
      'resources',
      'itemType',
    ],
    optional: {
      description: ['pb_schema', 'setup-pocketbase'],
      resources: ['pb_schema', 'setup-pocketbase'],
      itemType: ['pb_schema'],
    },
    selects: { itemType: SELECT_FIELDS.runStepItemType },
    nullable: ['itemType'],
  },
  notification: {
    collection: 'notifications',
    fields: [...ROW_FIELDS, 'user', 'type', 'title', 'message', 'data', 'isRead'],
    optional: {},
    selects: { type: SELECT_FIELDS.notificationType },
    nullable: [],
  },
  activityEntry: {
    collection: 'activityLog',
    fields: [...ROW_FIELDS, 'user', 'resourceType', 'resourceId', 'action', 'metadata'],
    optional: {},
    selects: { resourceType: SELECT_FIELDS.activityResourceType, action: SELECT_FIELDS.activityAction },
    nullable: [],
  },
} as const satisfies Readonly<Record<RecordKind, RecordShape>>;

type ShapeOf<K extends RecordKind> = (typeof RECORD_SHAPES)[K];
type FieldRenames<K extends RecordKind> = ShapeOf<K>['collection'] extends keyof typeof STORAGE_FIELDS
  ? (typeof STORAGE_FIELDS)[ShapeOf<K>['collection']]
  : Record<never, never>;
type SelectKey<K extends RecordKind> = keyof ShapeOf<K>['selects'];

/** A stored select holds a string; an optional or nullable one may also be empty. */
type StoredSelect<T> = null extends T ? string | null : string;

/**
 * The stored row of a record: renamed fields under their storage names, and
 * select fields as the raw string PocketBase holds.
 */
export type StoredRow<K extends RecordKind> = {
  readonly [F in keyof Records[K] as F extends keyof FieldRenames<K> ? FieldRenames<K>[F] & string : F]: F extends SelectKey<K>
    ? StoredSelect<Records[K][F]>
    : Records[K][F];
};

/** What a PocketBase response adds to a row. `fromStorage` checks `collectionName` and drops the rest. */
export interface ResponseMetadata {
  readonly collectionId?: string;
  readonly collectionName?: string;
  readonly expand?: unknown;
}

export type StoredRowInput<K extends RecordKind> = StoredRow<K> & ResponseMetadata;

function own(object: object, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(object, key);
}

/** A field counts as present when it is an own property that isn't `undefined`. */
function present(object: object, key: string): boolean {
  return own(object, key) && (object as Record<string, unknown>)[key] !== undefined;
}

function readSelect(select: SelectField, nullable: boolean, stored: unknown): string | null {
  if (nullable && (stored === null || stored === '')) return null;
  return canonicalValue(select.values, stored) ?? UNKNOWN_VALUE;
}

function writeSelect(kind: RecordKind, field: string, select: SelectField, nullable: boolean, value: unknown): string | null {
  if (value === null && nullable) return null;
  const stored = typeof value === 'string' && own(select.values, value) ? select.values[value] : undefined;
  if (stored !== undefined) return stored;
  throw new RangeError(`toStorage('${kind}'): ${field} ${JSON.stringify(value)} has no stored value; resolve it before writing`);
}

/** The record for a stored row. Throws when the row is from another collection or lacks a field every variant has. */
export function fromStorage<K extends RecordKind>(kind: K, row: StoredRowInput<K>): Records[K] {
  const shape: RecordShape = RECORD_SHAPES[kind];
  const collection = STORAGE_COLLECTIONS[shape.collection];
  const source = row as unknown as Readonly<Record<string, unknown>>;
  if (source.collectionName !== undefined && source.collectionName !== collection) {
    throw new TypeError(`fromStorage('${kind}') reads ${collection} rows, not ${String(source.collectionName)}`);
  }
  const record: Record<string, unknown> = {};
  for (const field of shape.fields) {
    const stored = storageField(shape.collection, field);
    if (!present(source, stored)) {
      if (own(shape.optional, field)) continue;
      throw new TypeError(`fromStorage('${kind}'): the ${collection} row has no ${stored} field`);
    }
    const select = shape.selects[field];
    record[field] = select ? readSelect(select, shape.nullable.includes(field), source[stored]) : source[stored];
  }
  return record as unknown as Records[K];
}

/** The stored row for a record, ready for a write. Throws on an `unknown` select value. */
export function toStorage<K extends RecordKind>(kind: K, record: Records[K]): StoredRow<K> {
  const shape: RecordShape = RECORD_SHAPES[kind];
  const source = record as unknown as Readonly<Record<string, unknown>>;
  const row: Record<string, unknown> = {};
  for (const field of shape.fields) {
    if (!present(source, field)) {
      if (own(shape.optional, field)) continue;
      throw new TypeError(`toStorage('${kind}'): the record has no ${field} field`);
    }
    const select = shape.selects[field];
    row[storageField(shape.collection, field)] = select
      ? writeSelect(kind, field, select, shape.nullable.includes(field), source[field])
      : source[field];
  }
  return row as unknown as StoredRow<K>;
}
