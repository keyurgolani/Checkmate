/**
 * CHECKMATE-01.1 · adapter (#29), test plan item 8: what the legacy-name
 * ratchet counts and what it leaves alone. src/test/legacy-name-scan.ts does
 * the counting, legacy-names.test.ts compares the counts with
 * legacy-name-baseline.ts, and scripts/ci/check-shrinking-lists.mjs keeps that
 * baseline from growing against the merge base.
 *
 * In non-test files under src/, the ratchet counts:
 * - a legacy storage name from storage.ts as a whole string literal, such as
 *   `'blueprints'` or `'instance_reminder'`;
 * - a legacy relation field read as `.blueprint`, `.instance` or `.sourceItem`;
 * - a legacy name inside a filter, expand, sort or fields string: a relation
 *   field in a field path, a collection after `@collection.`, or a quoted
 *   legacy value;
 * - an import of one of the 19 deprecated aliases from pocketbase-types.ts.
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

export interface Exemption {
  /** A repo-relative file, or a folder when it ends in `/`. */
  readonly path: string;
  /** For a folder entry: only the modules in it that export this name. */
  readonly exporting?: string;
  readonly owner: LeafId;
  readonly reason: string;
}

/** Never scanned. */
export const ALLOWLIST: readonly Exemption[] = [
  {
    path: 'src/lib/domain/',
    owner: '01.1',
    reason: 'The adapter itself, and the contract files that cite storage names.',
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
    reason: "The v1 export reader: 1.x files name their template `blueprint`. #75 removes this file once #74's readLegacyExport replaces it.",
  },
  {
    path: 'src/lib/portable/',
    exporting: 'readLegacyExport',
    owner: '16.1',
    reason: "#74's v1 export reader, in whichever module under src/lib/portable/ exports readLegacyExport.",
  },
  {
    path: 'src/lib/portable/blueprint/',
    owner: '16.3',
    reason: 'The blueprint file form (#76), the one place the word survives.',
  },
];
