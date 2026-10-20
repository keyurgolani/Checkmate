/**
 * CHECKMATE-01.1 · adapter (#29), test plan item 8: what the legacy-name
 * ratchet counts and what it leaves alone. src/test/legacy-name-scan.ts does
 * the counting, legacy-names.test.ts compares the counts with
 * legacy-name-baseline.ts, and scripts/ci/check-shrinking-lists.mjs keeps that
 * baseline from growing against the merge base.
 *
 * In non-test files under src/, `.d.ts` files included, the ratchet counts:
 * - a legacy storage name from storage.ts as a whole string literal, such as
 *   `'blueprints'` or `'instance_reminder'`, or as a whole template literal
 *   chunk between substitutions;
 * - a legacy collection in a collection URL, `/api/collections/<name>`;
 * - a legacy relation field (`blueprint`, `instance`, `sourceItem`) read as
 *   `.field`, written as an object key or shorthand, destructured, or declared
 *   as a type member;
 * - a legacy name in a filter, expand, sort or fields string: a relation field
 *   on either side of a comparison, in a back-relation such as
 *   `instanceItems_via_instance`, or before a modifier such as `:length`; a
 *   legacy collection after `@collection.` or before `_via_`; or a quoted
 *   legacy value;
 * - an import of one of the 19 deprecated aliases from pocketbase-types.ts,
 *   however it is imported, and any re-export of one;
 * - a use of a member named for a retired word, `LEGACY_MEMBERS` below.
 * Comments are never read.
 */
import type { LeafId } from './contract';

/** The module that exports the deprecated aliases, repo-relative and without its extension. */
export const LEGACY_ALIAS_MODULE = 'src/lib/pocketbase-types';

/**
 * The 19 deprecated aliases pocketbase-types.ts exports for retired names
 * (`pocketbase-types.ts:742-796` at 9019d17). Importing one counts. When a
 * leaf deletes an alias it drops it here too.
 */
export const LEGACY_ALIASES = [
  'Blueprint',
  'BlueprintCreate',
  'BlueprintUpdate',
  'isBlueprint',
  'BLUEPRINTS_COLLECTION',
  'Instance',
  'InstanceCreate',
  'InstanceUpdate',
  'isInstance',
  'INSTANCES_COLLECTION',
  'InstanceItem',
  'InstanceItemCreate',
  'InstanceItemUpdate',
  'isInstanceItem',
  'INSTANCE_ITEMS_COLLECTION',
  'Task',
  'TaskCreate',
  'TaskUpdate',
  'isTask',
] as const;

/**
 * Members named for a retired word, by the object or enum that holds them.
 * Every use counts, however the holder is imported: `Collections.ITEMS`,
 * `Collections['CHECKLISTS']`, or a destructured `CHECKLIST_ITEMS`.
 */
export const LEGACY_MEMBERS = {
  Collections: ['ITEMS', 'CHECKLISTS', 'CHECKLIST_ITEMS'],
  NotificationType: ['BLUEPRINT_UPDATED', 'INSTANCE_REMINDER'],
  ResourceType: ['ITEM', 'CHECKLIST', 'CHECKLIST_ITEM'],
} as const;

export interface Exemption {
  /** A repo-relative file, or a folder when it ends in `/`. */
  readonly path: string;
  /** For a folder entry: only the one module in it with an exported function declaration of this name. */
  readonly declaresFunction?: string;
  readonly owner: LeafId;
  readonly reason: string;
}

/** Never scanned. */
export const ALLOWLIST: readonly Exemption[] = [
  {
    path: 'src/lib/domain/',
    owner: '01.1',
    reason: 'The adapter itself, and the contract files that cite storage names. Nothing here imports from outside the folder.',
  },
];

/**
 * Code whose job is the legacy names, so it never counts and never needs to
 * shrink. A leaf that moves one of these jobs moves its entry in the same PR.
 */
export const PERMANENT_ENTRIES: readonly Exemption[] = [
  {
    path: 'src/lib/services/export/import-parsers.ts',
    owner: '16.2',
    reason:
      "The v1 export reader. 1.x files can carry their template as `blueprint`, and its CSV reader takes a `blueprint` column. #75 removes this file once #74's readLegacyExport replaces it.",
  },
  {
    path: 'src/lib/portable/',
    declaresFunction: 'readLegacyExport',
    owner: '16.1',
    reason:
      "#74's v1 export reader: the one module under src/lib/portable/ that declares `export function readLegacyExport`. legacy-names.test.ts fails if a second module claims it.",
  },
  {
    path: 'src/lib/portable/blueprint/',
    owner: '16.3',
    reason:
      "The blueprint file form (#76), the one place the word survives. 16.3's plan and apply routes, and 04.1's `/draft/commands` check that refuses blueprint causation, import the file-form constants from this module instead of writing the word.",
  },
];
