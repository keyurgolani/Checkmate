/**
 * CHECKMATE-01.1 (#29): retention classes, purge rules, and the relation
 * matrix for every baseline collection and relation, `instances.workspace`,
 * and the planned relations #29 names. A leaf that adds a collection or a
 * relation adds its row here.
 *
 * DeleteAccount (02.1), DeleteWorkspace (03.1) and ArchiveTemplate (04.3) are
 * soft deletes. Only the system actor purges, as a 12.1 slice B job with a
 * receipt event.
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
  account: { owner: '02.1', after: 'DeleteAccount', when: 'after a 30-day grace (19.2 config)' },
  workspace: { owner: '03.1', after: 'DeleteWorkspace', when: 'after a 30-day grace (19.2 config)' },
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
  readonly onPurge: Readonly<Record<PurgeKind, PurgeEffect>>;
}

export const CLASS_RULES: Readonly<Record<RetentionClass, ClassRule>> = {
  history: {
    meaning: 'What happened: runs and run steps today, and later execution records.',
    purge:
      "Removed, with a receipt, only by 07.2's DeleteRun, the workspace purge (which calls it) or a 12.2 policy job. Account and template purges only detach these rows.",
    onPurge: { account: 'detach', workspace: 'delete', template: 'detach' },
  },
  proof: {
    meaning: 'Records something else proves against.',
    purge:
      'Kept while referenced, then history. Revisions and completion records never leave proof. Content purges (10.1, 10.3) leave a digest.',
    onPurge: { account: 'keep', workspace: 'keep', template: 'keep' },
  },
  ephemeral: {
    meaning: "Short-lived state: 07.3's unapplied plans and 20.1's demo tenants.",
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
      "The purge turns the row into its tombstone. Only demo teardown, and 04.3's delete of a template with no revision or reference, hard-delete one.",
    onPurge: { account: 'tombstone', workspace: 'tombstone', template: 'tombstone' },
  },
};

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
  { relation: 'instances.workspace', references: 'workspaces', baseline: 'new', target: 'restrict', executor: '18.2', note: 'Gate 1.' },
  { relation: 'templateRevisions.template', references: 'blueprints', baseline: 'planned', target: 'restrict', executor: '04.1' },
  { relation: 'blueprints.currentRevision', references: 'templateRevisions', baseline: 'planned', target: 'restrict', executor: '04.1' },
  { relation: 'blueprints.baseRevision', references: 'templateRevisions', baseline: 'planned', target: 'restrict', executor: '04.1' },
  { relation: 'instances.templateRevision', references: 'templateRevisions', baseline: 'planned', target: 'restrict', executor: '04.1' },
  { relation: 'instances.currentRunSource', references: 'runSources', baseline: 'planned', target: 'restrict', executor: '07.2' },
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

/** The retention class of a collection named in this file. */
export function classOf(collection: string): RetentionClass | undefined {
  return COLLECTIONS.find((row) => row.collection === collection)?.class;
}
