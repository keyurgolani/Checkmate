/**
 * CHECKMATE-01.1 (#29): retention classes, purge rules, and the relation
 * matrix for every baseline collection and relation, `instances.workspace`,
 * and the planned relations #29 names. A leaf that adds a collection or a
 * relation adds its row here.
 *
 * DeleteAccount (02.1), DeleteWorkspace (03.1) and ArchiveTemplate (04.3) are
 * soft deletes. Only the system actor purges, as a job on 12.1's job runtime
 * that records a receipt event. #29 also lists transfer (03.1) here, but
 * TransferOwnership swaps the owner in one step and deletes nothing, so it
 * has no purge.
 */
import type { LeafId } from './contract';
import type { CommandName } from './lifecycles';

export const RETENTION_CLASSES = ['history', 'proof', 'ephemeral', 'operational', 'tombstone'] as const;
export type RetentionClass = (typeof RETENTION_CLASSES)[number];

export type PurgeKind = 'account' | 'workspace' | 'template';

export interface Purge {
  readonly owner: LeafId;
  /** The soft delete it follows. */
  readonly after: CommandName;
  readonly when: string;
}

export const PURGES: Readonly<Record<PurgeKind, Purge>> = {
  account: { owner: '02.1', after: 'DeleteAccount', when: 'after a 30-day grace period, which operators can change in 19.2' },
  workspace: { owner: '03.1', after: 'DeleteWorkspace', when: 'after a 30-day grace period, which operators can change in 19.2' },
  template: { owner: '04.3', after: 'ArchiveTemplate', when: 'with its workspace' },
};

/**
 * What a purge does to a row it covers. `tombstone`: the row becomes its
 * tombstone (id, name snapshot, `purged`), which fires no cascade. `delete`:
 * the purge job deletes it, with a receipt. `detach`: the row stays, keeps a
 * display snapshot, and drops its relation. `keep`: the row stays. `window`:
 * the purge leaves it, and its own window deletes it.
 */
export type PurgeEffect = 'tombstone' | 'delete' | 'detach' | 'keep' | 'window';

export interface ClassRule {
  readonly meaning: string;
  readonly purge: string;
  /** The effect on a row of this class. A proof row nothing references takes history's effect. */
  readonly onPurge: Readonly<Record<PurgeKind, PurgeEffect>>;
}

export const CLASS_RULES: Readonly<Record<RetentionClass, ClassRule>> = {
  history: {
    meaning: 'What happened: runs and run steps today, and later execution records.',
    purge:
      'Removed, with a receipt, only by DeleteRun from 07.2, by the workspace purge, which calls it, or by a retention policy job from 12.2. Account and template purges only detach these rows.',
    onPurge: { account: 'detach', workspace: 'delete', template: 'detach' },
  },
  proof: {
    meaning: 'Records something else proves against.',
    purge:
      'Kept while referenced. Once nothing references it, a proof row is history, except revisions and completion records, which never leave proof. Content purges by 10.1 and 10.3 leave a digest.',
    onPurge: { account: 'keep', workspace: 'keep', template: 'keep' },
  },
  ephemeral: {
    meaning: 'Short-lived state: unapplied upgrade plans from 07.3 and demo tenants from 20.1.',
    purge:
      'Deleted when its window ends. Demo tenants go at zero grace with their own revisions, keeping any revision something else references or installs.',
    onPurge: { account: 'window', workspace: 'window', template: 'window' },
  },
  operational: {
    meaning: 'Working state.',
    purge: "Deleted when its leaf's window ends, or with its account, workspace or template.",
    onPurge: { account: 'delete', workspace: 'delete', template: 'delete' },
  },
  tombstone: {
    meaning: 'Accounts, workspaces and templates, which other rows point at.',
    purge:
      'The purge turns the row into its tombstone. Only demo teardown, and the delete in 04.3 of a template with no revision or reference, hard-delete one.',
    onPurge: { account: 'tombstone', workspace: 'tombstone', template: 'tombstone' },
  },
};

/** Proof collections that never leave proof, referenced or not. */
export const PERMANENT_PROOF = ['templateRevisions', 'completionRecords'] as const;

export interface CollectionRetention {
  readonly collection: string;
  readonly class: RetentionClass;
  /** `baseline`: in pb_schema.json at 9019d17. `planned`: named by a #29 planned relation. */
  readonly status: 'baseline' | 'planned';
  /** The leaf that adds a planned collection. */
  readonly addedBy?: LeafId;
  readonly note?: string;
}

export const COLLECTIONS: readonly CollectionRetention[] = [
  { collection: 'users', class: 'tombstone', status: 'baseline' },
  { collection: 'workspaces', class: 'tombstone', status: 'baseline' },
  { collection: 'blueprints', class: 'tombstone', status: 'baseline' },
  { collection: 'items', class: 'operational', status: 'baseline' },
  { collection: 'collaborators', class: 'operational', status: 'baseline', note: 'Frozen by 03.1.' },
  { collection: 'instances', class: 'history', status: 'baseline' },
  { collection: 'instanceItems', class: 'history', status: 'baseline' },
  { collection: 'notifications', class: 'operational', status: 'baseline', note: 'Dropped by 12.2.' },
  { collection: 'activityLog', class: 'operational', status: 'baseline', note: 'Dropped by 12.2.' },
  { collection: 'templateRevisions', class: 'proof', status: 'planned', addedBy: '04.1' },
  { collection: 'runSources', class: 'proof', status: 'planned', addedBy: '07.2' },
  { collection: 'completionRecords', class: 'proof', status: 'planned', addedBy: '10.3' },
];

/** The retention class of a collection named in this file. */
export function classOf(collection: string): RetentionClass | undefined {
  return COLLECTIONS.find((row) => row.collection === collection)?.class;
}

/**
 * What a purge does to one row of a collection. A proof row that nothing
 * references is history, unless its collection is permanent proof.
 */
export function purgeEffect(collection: string, kind: PurgeKind, row: { readonly referenced: boolean }): PurgeEffect {
  const rowClass = classOf(collection);
  if (rowClass === undefined) throw new RangeError(`${collection} has no retention class`);
  const permanent = (PERMANENT_PROOF as readonly string[]).includes(collection);
  const effective = rowClass === 'proof' && !row.referenced && !permanent ? 'history' : rowClass;
  return CLASS_RULES[effective].onPurge[kind];
}

/**
 * Whether a purge or window may delete a template revision of this class:
 * only an ephemeral one that nothing else references or installs.
 */
export function mayDeleteRevision(
  revisionClass: RetentionClass,
  revision: { readonly referenced: boolean; readonly installed: boolean },
): boolean {
  return revisionClass === 'ephemeral' && !revision.referenced && !revision.installed;
}

/**
 * A relation at 9019d17. `cascade`: deleting the target deletes the row.
 * `required`: required with no cascade, so PocketBase refuses to delete the
 * target. `optional`: PocketBase clears the field. `new` and `planned`: not
 * in the baseline schema.
 */
export type BaselineBehavior = 'cascade' | 'required' | 'optional' | 'new' | 'planned';

/**
 * Where #29 takes a relation. `restrict`: the target can't be deleted while
 * the row points at it. `detach`: the purge clears the relation and the row
 * keeps a snapshot. `text-id`: a text ID with a snapshot instead of a
 * relation, so nothing cascades or blocks.
 */
export type TargetBehavior = 'cascade' | 'restrict' | 'detach' | 'text-id';

export interface RelationRetention {
  /** `collection.field`. */
  readonly relation: string;
  readonly references: string;
  readonly baseline: BaselineBehavior;
  readonly target: TargetBehavior;
  /**
   * A restrict relation the owner makes nullable, such as a run with no
   * recorded revision. Every other restrict relation is required.
   */
  readonly nullable?: true;
  /** What the row keeps once detached. */
  readonly snapshot?: 'actor' | 'title' | 'display';
  /** The leaf that moves the relation from baseline to target. Null when it stays as it is. */
  readonly executor: LeafId | null;
  /** A run step's relation inside its own run, the one place history may cascade. */
  readonly withinRun?: true;
  readonly note?: string;
}

export const RELATIONS: readonly RelationRetention[] = [
  { relation: 'workspaces.owner', references: 'users', baseline: 'cascade', target: 'restrict', executor: '02.1' },
  { relation: 'blueprints.workspace', references: 'workspaces', baseline: 'cascade', target: 'restrict', executor: '03.1' },
  { relation: 'blueprints.owner', references: 'users', baseline: 'required', target: 'detach', snapshot: 'actor', executor: '02.1' },
  { relation: 'instances.user', references: 'users', baseline: 'cascade', target: 'detach', snapshot: 'actor', executor: '02.1' },
  {
    relation: 'instances.blueprint',
    references: 'blueprints',
    baseline: 'required',
    target: 'detach',
    snapshot: 'title',
    executor: '07.2',
    note: 'The run keeps its revision.',
  },
  { relation: 'items.reference', references: 'blueprints', baseline: 'optional', target: 'detach', snapshot: 'display', executor: '04.3' },
  { relation: 'instanceItems.sourceItem', references: 'items', baseline: 'optional', target: 'detach', snapshot: 'display', executor: '07.2' },
  {
    relation: 'instances.workspace',
    references: 'workspaces',
    baseline: 'new',
    target: 'restrict',
    nullable: true,
    executor: '18.2',
    note: '18.2 adds it as an optional field with cascade off.',
  },
  { relation: 'templateRevisions.template', references: 'blueprints', baseline: 'planned', target: 'restrict', executor: '04.1' },
  {
    relation: 'blueprints.currentRevision',
    references: 'templateRevisions',
    baseline: 'planned',
    target: 'restrict',
    nullable: true,
    executor: '04.1',
    note: 'Empty until the first release.',
  },
  {
    relation: 'blueprints.baseRevision',
    references: 'templateRevisions',
    baseline: 'planned',
    target: 'restrict',
    nullable: true,
    executor: '04.1',
    note: 'Empty until the first release.',
  },
  {
    relation: 'instances.templateRevision',
    references: 'templateRevisions',
    baseline: 'planned',
    target: 'restrict',
    nullable: true,
    executor: '04.1',
    note: 'Empty for runs started before revisions existed.',
  },
  {
    relation: 'instances.currentRunSource',
    references: 'runSources',
    baseline: 'planned',
    target: 'restrict',
    nullable: true,
    executor: '07.2',
    note: 'Empty for runs with no recorded source.',
  },
  {
    relation: 'runSources.run',
    references: 'instances',
    baseline: 'planned',
    target: 'detach',
    snapshot: 'display',
    executor: '07.2',
    note: "Optional with no cascade. DeleteRun's tombstone clears it and keeps the run's id as text.",
  },
  { relation: 'completionRecords.run', references: 'instances', baseline: 'planned', target: 'text-id', snapshot: 'display', executor: '10.3' },
  {
    relation: 'completionRecords.workspace',
    references: 'workspaces',
    baseline: 'planned',
    target: 'text-id',
    snapshot: 'display',
    executor: '10.3',
  },
  { relation: 'items.blueprint', references: 'blueprints', baseline: 'cascade', target: 'cascade', executor: null },
  { relation: 'items.parent', references: 'items', baseline: 'cascade', target: 'cascade', executor: null },
  { relation: 'collaborators.blueprint', references: 'blueprints', baseline: 'cascade', target: 'cascade', executor: null },
  { relation: 'collaborators.user', references: 'users', baseline: 'cascade', target: 'cascade', executor: null },
  {
    relation: 'instanceItems.instance',
    references: 'instances',
    baseline: 'cascade',
    target: 'cascade',
    executor: null,
    withinRun: true,
  },
  {
    relation: 'instanceItems.parent',
    references: 'instanceItems',
    baseline: 'cascade',
    target: 'cascade',
    executor: null,
    withinRun: true,
  },
  { relation: 'notifications.user', references: 'users', baseline: 'cascade', target: 'cascade', executor: null },
  { relation: 'activityLog.user', references: 'users', baseline: 'cascade', target: 'cascade', executor: null },
];
