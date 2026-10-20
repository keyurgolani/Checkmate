/**
 * CHECKMATE-01.1 (#29): the domain contract version, leaf IDs, and the
 * decision records the contract cites. A leaf names the version it builds on.
 */

/**
 * Semver for every file in src/lib/domain/ that #29 publishes. Removing or
 * renaming a term, state or transition, or changing a Step Key or counter
 * rule, is a major bump. Additions are minor. A cited rule changes only
 * through a superseding decision record and a bump.
 */
export const DOMAIN_CONTRACT_VERSION = '1.0.0';

type Epic =
  | '00' | '01' | '02' | '03' | '04' | '05' | '06' | '07' | '08' | '09' | '10' | '11'
  | '12' | '13' | '14' | '15' | '16' | '17' | '18' | '19' | '20' | '21' | '22';

/** A leaf as the issue bodies write it: `04.1` is CHECKMATE-04.1. */
export type LeafId = `${Epic}.${1 | 2 | 3 | 4}`;

/** Leaves per epic, CHECKMATE-00 to CHECKMATE-22, filed in order as #25 to #95. */
const LEAVES_PER_EPIC = [4, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 4];
const FIRST_LEAF_ISSUE = 25;

/** The GitHub issue of a leaf: `00.1` is #25, `01.1` is #29, `22.4` is #95. */
export function leafIssue(leaf: LeafId): number {
  const [epicPart = '', leafPart = ''] = leaf.split('.');
  const epic = Number(epicPart);
  const index = Number(leafPart);
  const count = LEAVES_PER_EPIC[epic];
  if (count === undefined || index < 1 || index > count) {
    throw new RangeError(`CHECKMATE-${leaf} is not a filed leaf`);
  }
  const before = LEAVES_PER_EPIC.slice(0, epic).reduce((sum, n) => sum + n, 0);
  return FIRST_LEAF_ISSUE + before + index - 1;
}

export interface DecisionRecord {
  /** File name in docs/architecture/decisions/, without `.md`. */
  readonly id: string;
  readonly title: string;
}

/** The records #29 requires, in glossary order. Records from other leaves share the folder. */
export const DECISION_RECORDS: readonly DecisionRecord[] = [
  { id: 'run', title: 'Run' },
  { id: 'blueprint', title: 'Blueprint' },
  { id: 'step-and-task', title: 'Step and Task' },
  { id: 'section-and-reference', title: 'Section and reference' },
  { id: 'step-key', title: 'Step Key' },
  { id: 'aggregates', title: 'Aggregates and counters' },
  { id: 'revision-store', title: 'One revision store' },
  { id: 'retention', title: 'Retention' },
  { id: 'ia-map', title: 'Navigation and route map' },
  { id: 'visibility', title: 'Visibility split' },
  { id: 'personal-presentation', title: 'Personal presentation' },
];
