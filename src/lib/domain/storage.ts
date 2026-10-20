/**
 * CHECKMATE-01.1 · adapter (#29): the one place legacy storage names live.
 *
 * Templates are stored in `blueprints`, template steps in `items`, runs in
 * `instances` and run steps in `instanceItems`. Their relation fields and some
 * stored select values keep the same retired words. This file maps each
 * canonical name to what PocketBase holds, in every install variant, and
 * `Collections` in pocketbase-types.ts re-exports the collection map from
 * here. records.ts reads and writes rows through these maps.
 *
 * Code outside src/lib/domain/ names collections through `Collections` and
 * never writes a legacy storage name itself: legacy-names.test.ts counts them
 * per file against legacy-name-baseline.ts, which only shrinks. An 18.2
 * migration that renames a storage name changes this file in the same PR.
 */

/**
 * The three ways a baseline database gets its schema (#31): pb_schema.json,
 * which schema-init.ts and import-schema.ts load, and the two setup scripts,
 * which #81 (CHECKMATE-18.2 · gate 1) retires. Every name here holds in all
 * three unless its entry lists the variants that have it.
 */
export const INSTALL_VARIANTS = ['pb-schema', 'setup-pocketbase', 'create-collections'] as const;
export type InstallVariant = (typeof INSTALL_VARIANTS)[number];

/** The file each install variant's schema comes from, repo-relative. */
export const INSTALL_VARIANT_SOURCES: Readonly<Record<InstallVariant, string>> = {
  'pb-schema': 'docker/pocketbase/pb_schema.json',
  'setup-pocketbase': 'scripts/setup-pocketbase.ts',
  'create-collections': 'scripts/create-collections.ts',
};

/**
 * Canonical collection name to storage collection. The names in the domain,
 * the records and new code are the keys; the values are what PocketBase holds.
 * A key differs from its value only where storage keeps a retired word.
 * `collaborators` and `activityLog` keep theirs: 03.1 turns the first into
 * grants and memberships, and 12.2 drops the second, so neither is a rename
 * (#31's `collaborators` and `legacy-history` cases).
 */
export const STORAGE_COLLECTIONS = {
  users: 'users',
  workspaces: 'workspaces',
  templates: 'blueprints',
  templateSteps: 'items',
  collaborators: 'collaborators',
  runs: 'instances',
  runSteps: 'instanceItems',
  notifications: 'notifications',
  activityLog: 'activityLog',
} as const;

export type CollectionKey = keyof typeof STORAGE_COLLECTIONS;
export type StorageCollection = (typeof STORAGE_COLLECTIONS)[CollectionKey];

/**
 * The collection names services use, from pocketbase-types.ts. The first nine
 * keys are the canonical names in constant case. `ITEMS`, `CHECKLISTS` and
 * `CHECKLIST_ITEMS` predate the glossary and stay until 04.1, 05.2 and 07.x
 * rebuild the services that read them.
 */
export const Collections = {
  USERS: STORAGE_COLLECTIONS.users,
  WORKSPACES: STORAGE_COLLECTIONS.workspaces,
  TEMPLATES: STORAGE_COLLECTIONS.templates,
  TEMPLATE_STEPS: STORAGE_COLLECTIONS.templateSteps,
  COLLABORATORS: STORAGE_COLLECTIONS.collaborators,
  RUNS: STORAGE_COLLECTIONS.runs,
  RUN_STEPS: STORAGE_COLLECTIONS.runSteps,
  NOTIFICATIONS: STORAGE_COLLECTIONS.notifications,
  ACTIVITY_LOG: STORAGE_COLLECTIONS.activityLog,
  /** @deprecated Use `Collections.TEMPLATE_STEPS`. */
  ITEMS: STORAGE_COLLECTIONS.templateSteps,
  /** @deprecated Use `Collections.RUNS`. */
  CHECKLISTS: STORAGE_COLLECTIONS.runs,
  /** @deprecated Use `Collections.RUN_STEPS`. */
  CHECKLIST_ITEMS: STORAGE_COLLECTIONS.runSteps,
} as const;

/** The keys of `Collections` that predate the glossary, with the canonical collection each names. */
export const LEGACY_COLLECTION_KEYS = {
  ITEMS: 'templateSteps',
  CHECKLISTS: 'runs',
  CHECKLIST_ITEMS: 'runSteps',
} as const satisfies Partial<Record<keyof typeof Collections, CollectionKey>>;

/**
 * Relation fields whose stored name keeps a retired word: canonical field
 * name to storage field, per canonical collection. Every other field keeps
 * its stored name, and #31's map gives each one its own entry.
 */
export const STORAGE_FIELDS = {
  templateSteps: { template: 'blueprint' },
  collaborators: { template: 'blueprint' },
  runs: { template: 'blueprint' },
  runSteps: { run: 'instance', sourceStep: 'sourceItem' },
} as const satisfies Partial<Record<CollectionKey, Readonly<Record<string, string>>>>;

/** Canonical notification type to stored value. */
export const NOTIFICATION_TYPES = {
  collaboration_invite: 'collaboration_invite',
  collaboration_accepted: 'collaboration_accepted',
  collaboration_revoked: 'collaboration_revoked',
  template_updated: 'blueprint_updated',
  run_reminder: 'instance_reminder',
  access_request: 'access_request',
  system: 'system',
} as const;
export type NotificationType = keyof typeof NOTIFICATION_TYPES;

/**
 * Canonical activity resource type to stored value. The `activityLog`
 * select holds the stored values in every install variant, so it rejects
 * the `template`, `checklist` and `checklistItem` that `ResourceType` in
 * pocketbase-types.ts sends today. Writers that go through records.ts send
 * the stored value instead.
 */
export const ACTIVITY_RESOURCE_TYPES = {
  template: 'blueprint',
  templateStep: 'item',
  run: 'instance',
  runStep: 'instanceItem',
  collaborator: 'collaborator',
  workspace: 'workspace',
} as const;
export type ActivityResourceType = keyof typeof ACTIVITY_RESOURCE_TYPES;

export const TEMPLATE_VISIBILITIES = { private: 'private', public: 'public', shared: 'shared' } as const;
export type TemplateVisibility = keyof typeof TEMPLATE_VISIBILITIES;

/** Stored item types. 05.2 maps them to kind keys and retires the column; until then they keep their names. */
export const STEP_ITEM_TYPES = { task: 'task', reference: 'reference', phase: 'phase' } as const;
export type StepItemType = keyof typeof STEP_ITEM_TYPES;

export const ACTIVITY_ACTIONS = {
  create: 'create',
  update: 'update',
  delete: 'delete',
  complete: 'complete',
  uncomplete: 'uncomplete',
  invite: 'invite',
  accept: 'accept',
  revoke: 'revoke',
} as const;
export type ActivityAction = keyof typeof ACTIVITY_ACTIONS;

/** Canonical value to stored value, for one select field. */
export type ValueMap = Readonly<Record<string, string>>;

export interface SelectField {
  readonly collection: CollectionKey;
  /** The stored field name. None of these is renamed. */
  readonly field: string;
  readonly values: ValueMap;
  /** The variants whose schema has the field, when not all three. */
  readonly variants?: readonly InstallVariant[];
  /** Stored values only some variants accept, with those variants. */
  readonly valueVariants?: Readonly<Record<string, readonly InstallVariant[]>>;
}

/** The select fields records.ts reads, with what each install variant accepts. */
export const SELECT_FIELDS = {
  templateVisibility: { collection: 'templates', field: 'visibility', values: TEMPLATE_VISIBILITIES },
  templateStepItemType: {
    collection: 'templateSteps',
    field: 'itemType',
    values: STEP_ITEM_TYPES,
    valueVariants: { phase: ['pb-schema'] },
  },
  runStepItemType: { collection: 'runSteps', field: 'itemType', values: STEP_ITEM_TYPES, variants: ['pb-schema'] },
  notificationType: {
    collection: 'notifications',
    field: 'type',
    values: NOTIFICATION_TYPES,
    valueVariants: { access_request: ['pb-schema'] },
  },
  activityResourceType: { collection: 'activityLog', field: 'resourceType', values: ACTIVITY_RESOURCE_TYPES },
  activityAction: { collection: 'activityLog', field: 'action', values: ACTIVITY_ACTIONS },
} as const satisfies Readonly<Record<string, SelectField>>;

/** The stored name of a field: its rename, or the name itself. */
export function storageField(collection: CollectionKey, field: string): string {
  const renames: Readonly<Record<string, string>> | undefined = (STORAGE_FIELDS as Partial<Record<CollectionKey, Readonly<Record<string, string>>>>)[
    collection
  ];
  return renames?.[field] ?? field;
}

/** The canonical value for a stored one, or undefined when the map has no such stored value. */
export function canonicalValue<M extends ValueMap>(values: M, stored: unknown): (keyof M & string) | undefined {
  if (typeof stored !== 'string') return undefined;
  return (Object.keys(values) as (keyof M & string)[]).find((canonical) => values[canonical] === stored);
}

export interface StorageName {
  readonly kind: 'collection' | 'field' | 'value';
  /** The storage path: `blueprints`, `items.blueprint`, or `notifications.type.blueprint_updated`. */
  readonly path: string;
  /** #31's deterministic map ID for the path. */
  readonly mapId: string;
  /** What PocketBase holds. */
  readonly storage: string;
  /** The name the domain uses: a collection key, a field name, or a canonical value. */
  readonly canonical: string;
  /** True when storage keeps a retired word: a legacy name that only this adapter may write. */
  readonly rename: boolean;
  /** The install variants that have it. */
  readonly variants: readonly InstallVariant[];
}

function storageName(
  kind: StorageName['kind'],
  path: string,
  storage: string,
  canonical: string,
  variants: readonly InstallVariant[] = INSTALL_VARIANTS,
): StorageName {
  const mapId = kind === 'value' ? `MAP:enum:${path}` : `MAP:${path}`;
  return { kind, path, mapId, storage, canonical, rename: storage !== canonical, variants };
}

/**
 * Every storage name this adapter maps, renamed or not: the collections, the
 * renamed relation fields, and each select value records.ts reads. #31's map
 * test 5 checks that each has a map entry.
 */
export const STORAGE_NAMES: readonly StorageName[] = [
  ...Object.entries(STORAGE_COLLECTIONS).map(([canonical, storage]) => storageName('collection', storage, storage, canonical)),
  ...Object.entries(STORAGE_FIELDS).flatMap(([collection, fields]) =>
    Object.entries(fields).map(([canonical, storage]) =>
      storageName('field', `${STORAGE_COLLECTIONS[collection as CollectionKey]}.${storage}`, storage, canonical),
    ),
  ),
  ...Object.values(SELECT_FIELDS).flatMap((select: SelectField) =>
    Object.entries(select.values).map(([canonical, storage]) =>
      storageName(
        'value',
        `${STORAGE_COLLECTIONS[select.collection]}.${select.field}.${storage}`,
        storage,
        canonical,
        select.valueVariants?.[storage] ?? select.variants ?? INSTALL_VARIANTS,
      ),
    ),
  ),
];

function unique(names: Iterable<string>): readonly string[] {
  return [...new Set(names)].sort();
}

/**
 * The legacy storage names: every stored name that keeps a retired word. The
 * ratchet counts them as whole string literals and in query strings.
 */
export const LEGACY_STORAGE_NAMES: readonly string[] = unique(STORAGE_NAMES.filter((name) => name.rename).map((name) => name.storage));

/** The legacy relation field names. The ratchet also counts them as `.name` access and as fields in query strings. */
export const LEGACY_FIELD_NAMES: readonly string[] = unique(
  STORAGE_NAMES.filter((name) => name.rename && name.kind === 'field').map((name) => name.storage),
);

/** The legacy collection names. The ratchet also counts them after `@collection.` in a filter. */
export const LEGACY_COLLECTION_NAMES: readonly string[] = unique(
  STORAGE_NAMES.filter((name) => name.rename && name.kind === 'collection').map((name) => name.storage),
);
