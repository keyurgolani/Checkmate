/**
 * CHECKMATE-01.1 (#29): the five lifecycles with transition tables (Template
 * Draft, Template Revision, Run, Run Step and Share Capability), the minimum
 * states of the other entities, the immutable records, the aggregates, and
 * every command the tables name.
 *
 * Each transition names its command, or `time` or `derived` as its cause. The
 * owning leaf builds the field and its commands. It may add states and
 * transitions with a minor bump, and removes or renames one only through a
 * superseding decision record and a major bump.
 */
import type { LeafId } from './contract';

interface CommandInfo {
  readonly owner: LeafId;
  readonly note?: string;
}

/** 04.1's closed set of draft ops. Each one is a `DraftCommand`. */
export const DRAFT_COMMANDS = [
  'AddStep',
  'UpdateStep',
  'MoveStep',
  'RemoveStep',
  'SetQuestion',
  'SetInclude',
  'SetLock',
  'SetHeaderField',
] as const;

/** Every command #29 names, with the leaf that builds it. #30's matrix rows use these names. */
export const COMMANDS = {
  DeleteAccount: { owner: '02.1', note: 'Soft delete. The account purge follows the grace period.' },
  DeleteWorkspace: { owner: '03.1', note: 'Soft delete. The workspace purge follows the grace period.' },
  TransferOwnership: { owner: '03.1' },
  CreateShareCapability: { owner: '03.3' },
  RevokeShareCapability: { owner: '03.3' },
  RevokeAllShareCapabilities: { owner: '03.3', note: 'For a workspace, or the whole deployment.' },
  CreateTemplateDraft: { owner: '04.1', note: 'Create, copy, duplicate, import and fork.' },
  DraftCommand: { owner: '04.1', note: `Any of 04.1's draft ops: ${DRAFT_COMMANDS.join(', ')}.` },
  PublishRevision: { owner: '04.1', note: 'Shown as "Release revision N".' },
  DeprecateRevision: { owner: '04.3' },
  UndeprecateRevision: { owner: '04.3' },
  ArchiveTemplate: { owner: '04.3', note: 'Soft delete. The template is purged with its workspace.' },
  CreateRun: { owner: '07.1' },
  StartRunFromDraft: { owner: '07.1', note: 'Releases revision N and starts a run in one attributed command.' },
  DeleteRun: { owner: '07.2' },
  PlanRunUpgrade: { owner: '07.3' },
  ApplyRunUpgrade: { owner: '07.3' },
  DeferRunUpgrade: { owner: '07.3' },
  SetStepState: { owner: '09.1', note: 'Takes the desired state.' },
  CompleteRun: { owner: '09.1' },
  ReopenRun: { owner: '09.1', note: 'Needs an actor and a reason.' },
  CancelRun: { owner: '09.1' },
  DecideApproval: { owner: '10.2', note: 'Approve, reject or rescind.' },
  PublishToCatalog: { owner: '13.1', note: 'Shown as "Publish to catalog".' },
} as const satisfies Record<string, CommandInfo>;

export type CommandName = keyof typeof COMMANDS;

export type Cause =
  | { readonly kind: 'command'; readonly command: CommandName; readonly note?: string }
  | { readonly kind: 'time'; readonly note: string }
  | { readonly kind: 'derived'; readonly note: string };

function by(command: CommandName, note?: string): Cause {
  return note === undefined ? { kind: 'command', command } : { kind: 'command', command, note };
}

function time(note: string): Cause {
  return { kind: 'time', note };
}

function derived(note: string): Cause {
  return { kind: 'derived', note };
}

export interface Transition<S extends string = string> {
  readonly from: S;
  readonly to: S;
  readonly cause: Cause;
}

export interface Entry<S extends string = string> {
  readonly state: S;
  readonly cause: Cause;
}

export interface Lifecycle<S extends string = string> {
  /** The glossary term whose state this is. */
  readonly entity: string;
  /** Where the state lives. */
  readonly field: string;
  /** How the state is kept, when the field alone doesn't say. */
  readonly note?: string;
  /** The leaf that builds the field and its commands. */
  readonly owner: LeafId;
  readonly states: readonly S[];
  /** The states a record starts in, and what creates it. */
  readonly initial: readonly Entry<S>[];
  /** States nothing leaves. */
  readonly terminal: readonly S[];
  readonly transitions: readonly Transition<S>[];
}

export const DRAFT_STATES = ['new', 'dirty', 'clean'] as const;
export type DraftState = (typeof DRAFT_STATES)[number];

export const REVISION_STATES = ['published', 'deprecated'] as const;
export type RevisionState = (typeof REVISION_STATES)[number];

export const RUN_STATUSES = ['scheduled', 'active', 'completed', 'cancelled'] as const;
export type RunStatus = (typeof RUN_STATUSES)[number];

export const STEP_STATES = ['pending', 'awaiting_approval', 'completed', 'excepted', 'invalidated'] as const;
export type StepState = (typeof STEP_STATES)[number];

export const STEP_INCLUSIONS = ['included', 'retired', 'excluded'] as const;
export type StepInclusion = (typeof STEP_INCLUSIONS)[number];

export const SHARE_CAPABILITY_STATUSES = [
  'active',
  'suspended',
  'revoked',
  'expired',
  'target_missing',
  'restore_invalidated',
] as const;
export type ShareCapabilityStatus = (typeof SHARE_CAPABILITY_STATUSES)[number];

/** A step counts as done in these states. */
export const DONE_STATES: readonly StepState[] = ['completed', 'excepted'];

/** Projection facets of a run. They are never statuses. Reopening is an event, never a state. */
export const RUN_FACETS = ['blocked', 'overdue', 'offline'] as const;

/**
 * Baseline fields that carry no state (#31). The run sync flag is the other
 * one; 07.3 removed its readers and 07.2 drops the column, so app code no
 * longer names it.
 */
export const STATELESS_FIELDS: readonly string[] = ['blueprints.version'];

export const TEMPLATE_DRAFT: Lifecycle<DraftState> = {
  entity: 'Template Draft',
  field: 'blueprints.draftState',
  owner: '04.1',
  states: DRAFT_STATES,
  initial: [{ state: 'new', cause: by('CreateTemplateDraft') }],
  terminal: [],
  transitions: [
    { from: 'new', to: 'dirty', cause: by('DraftCommand') },
    { from: 'clean', to: 'dirty', cause: by('DraftCommand') },
    { from: 'new', to: 'clean', cause: by('PublishRevision') },
    { from: 'dirty', to: 'clean', cause: by('PublishRevision') },
    { from: 'new', to: 'clean', cause: by('StartRunFromDraft') },
    { from: 'dirty', to: 'clean', cause: by('StartRunFromDraft') },
  ],
};

export const TEMPLATE_REVISION: Lifecycle<RevisionState> = {
  entity: 'Template Revision',
  field: 'templateLifecycleDecisions',
  note: "A revision's state is its latest deprecate or undeprecate decision. Revision rows never change.",
  owner: '04.3',
  states: REVISION_STATES,
  initial: [
    { state: 'published', cause: by('PublishRevision') },
    { state: 'published', cause: by('StartRunFromDraft') },
  ],
  terminal: [],
  transitions: [
    { from: 'published', to: 'deprecated', cause: by('DeprecateRevision') },
    { from: 'deprecated', to: 'published', cause: by('UndeprecateRevision') },
  ],
};

export const RUN: Lifecycle<RunStatus> = {
  entity: 'Run',
  field: 'instances.status',
  owner: '09.1',
  states: RUN_STATUSES,
  initial: [
    { state: 'active', cause: by('CreateRun') },
    { state: 'active', cause: by('StartRunFromDraft') },
    { state: 'scheduled', cause: by('CreateRun', 'for an 08.2 schedule occurrence') },
  ],
  terminal: ['cancelled'],
  transitions: [
    { from: 'scheduled', to: 'active', cause: by('SetStepState', 'the first step change starts the run') },
    {
      from: 'active',
      to: 'completed',
      cause: by('CompleteRun', 'fires by itself only when a step moves to completed and done reaches executable'),
    },
    { from: 'completed', to: 'active', cause: by('ReopenRun') },
    { from: 'scheduled', to: 'cancelled', cause: by('CancelRun') },
    { from: 'active', to: 'cancelled', cause: by('CancelRun') },
  ],
};

export const RUN_STEP_STATE: Lifecycle<StepState> = {
  entity: 'Run Step',
  field: 'instanceItems.state',
  owner: '09.1',
  states: STEP_STATES,
  initial: [
    { state: 'pending', cause: by('CreateRun') },
    { state: 'pending', cause: by('StartRunFromDraft') },
    { state: 'pending', cause: by('ApplyRunUpgrade', 'a step the upgrade adds') },
  ],
  terminal: [],
  transitions: [
    { from: 'pending', to: 'completed', cause: by('SetStepState') },
    { from: 'pending', to: 'awaiting_approval', cause: by('SetStepState', 'requests approval') },
    { from: 'pending', to: 'excepted', cause: by('SetStepState', "with one of 08.3's exception kinds") },
    { from: 'awaiting_approval', to: 'completed', cause: by('DecideApproval', 'approve') },
    { from: 'awaiting_approval', to: 'pending', cause: by('DecideApproval', 'reject, with a rework reason') },
    ...(['completed', 'excepted'] as const).flatMap((from): Transition<StepState>[] => [
      { from, to: 'pending', cause: by('SetStepState', 'reopen') },
      { from, to: 'invalidated', cause: by('ApplyRunUpgrade') },
      { from, to: 'invalidated', cause: by('SetStepState', 'a subject step reopens') },
      { from, to: 'invalidated', cause: by('DecideApproval', 'rescind') },
    ]),
    { from: 'invalidated', to: 'pending', cause: by('SetStepState', 'reopen') },
  ],
};

export const RUN_STEP_INCLUSION: Lifecycle<StepInclusion> = {
  entity: 'Run Step',
  field: 'instanceItems.inclusion',
  owner: '07.3',
  states: STEP_INCLUSIONS,
  initial: [
    { state: 'included', cause: by('CreateRun') },
    { state: 'included', cause: by('StartRunFromDraft') },
    { state: 'included', cause: by('ApplyRunUpgrade', 'a step the upgrade adds') },
    { state: 'excluded', cause: by('CreateRun', 'its 08.3 condition is false') },
    { state: 'excluded', cause: by('ApplyRunUpgrade', "an added step's 08.3 condition is false") },
  ],
  terminal: [],
  transitions: [
    { from: 'included', to: 'retired', cause: by('ApplyRunUpgrade', 'the new revision drops the step, which keeps its state and history') },
    { from: 'retired', to: 'included', cause: by('ApplyRunUpgrade', 'a reversal plan brings the step back') },
    { from: 'included', to: 'excluded', cause: by('ApplyRunUpgrade', "a pending step's 08.3 condition turns false") },
    { from: 'excluded', to: 'included', cause: by('ApplyRunUpgrade', 'its 08.3 condition turns true') },
  ],
};

export const SHARE_CAPABILITY: Lifecycle<ShareCapabilityStatus> = {
  entity: 'Share Capability',
  field: 'shareCapabilities',
  note: 'Status is derived on read. Rows are never deleted.',
  owner: '03.3',
  states: SHARE_CAPABILITY_STATUSES,
  initial: [{ state: 'active', cause: by('CreateShareCapability') }],
  terminal: ['revoked', 'expired', 'target_missing', 'restore_invalidated'],
  transitions: [
    { from: 'active', to: 'suspended', cause: derived('the creator lost the authority') },
    { from: 'suspended', to: 'active', cause: derived('the creator regained the authority before expiry') },
    ...(['active', 'suspended'] as const).flatMap((from): Transition<ShareCapabilityStatus>[] => [
      { from, to: 'revoked', cause: by('RevokeShareCapability') },
      { from, to: 'revoked', cause: by('RevokeAllShareCapabilities') },
      { from, to: 'revoked', cause: by('DeleteAccount', 'owner_removed') },
      { from, to: 'revoked', cause: by('DeleteWorkspace', 'owner_removed') },
      { from, to: 'expired', cause: time('expiresAt has passed') },
      { from, to: 'target_missing', cause: derived('the target no longer exists') },
      { from, to: 'restore_invalidated', cause: derived('a restore changed the deployment restore epoch') },
    ]),
  ],
};

/** The five lifecycles. Run Step has two fields, `state` and `inclusion`. */
export const LIFECYCLES = {
  templateDraft: TEMPLATE_DRAFT,
  templateRevision: TEMPLATE_REVISION,
  run: RUN,
  runStep: { state: RUN_STEP_STATE, inclusion: RUN_STEP_INCLUSION },
  shareCapability: SHARE_CAPABILITY,
} as const;

/** Every transition table, both Run Step fields included. */
export const TRANSITION_TABLES: readonly Lifecycle[] = [
  TEMPLATE_DRAFT,
  TEMPLATE_REVISION,
  RUN,
  RUN_STEP_STATE,
  RUN_STEP_INCLUSION,
  SHARE_CAPABILITY,
];

export interface MinimumStates {
  readonly entity: string;
  readonly states: readonly string[];
  readonly owner: LeafId;
  readonly note?: string;
}

/** The states other entities start with. Owners extend them and never contradict them. */
export const MINIMUM_STATES: readonly MinimumStates[] = [
  { entity: 'Account', states: ['active', 'deletion_pending', 'purged'], owner: '02.1' },
  { entity: 'Secret Reference', states: ['active', 'unusable', 'revoked'], owner: '02.2' },
  {
    entity: 'Workspace',
    states: ['active', 'archived', 'deletion_pending', 'purged'],
    owner: '03.1',
    note: 'Baseline `workspaces.isArchived`.',
  },
  {
    entity: 'Invitation',
    states: ['pending', 'accepted', 'expired', 'revoked'],
    owner: '03.1',
    note: 'Baseline `collaborators.acceptedAt`.',
  },
  { entity: 'Participant', states: ['active', 'suspended', 'revoked', 'expired'], owner: '03.2' },
  { entity: 'Template', states: ['active', 'deprecated', 'archived'], owner: '04.3', note: '`archived` is read-only.' },
  {
    entity: 'Update Notice',
    states: ['open', 'deferred', 'applied', 'superseded'],
    owner: '01.1',
    note: '06.3 creates the collection. When a deferral expires, the notice is open again.',
  },
  { entity: 'Assignment', states: ['assigned', 'claimed', 'released', 'unassigned', 'closed'], owner: '08.1' },
  { entity: 'Schedule', states: ['active', 'paused', 'ended'], owner: '08.2' },
  { entity: 'Evidence', states: ['attached', 'superseded'], owner: '10.1' },
  { entity: 'Comment', states: [], owner: '10.1', note: '10.1 defines its states.' },
  { entity: 'Catalog Package', states: ['listed', 'unlisted'], owner: '13.1', note: 'The listing state of each version.' },
  { entity: 'Installation', states: ['installed', 'quarantined', 'removed'], owner: '13.3' },
  { entity: 'Automation Definition', states: ['inactive', 'active', 'paused', 'suspended', 'archived'], owner: '15.3' },
];

export interface ImmutableRecord {
  readonly record: string;
  readonly storage: string;
  readonly owner: LeafId;
  readonly note?: string;
}

/** Records that never change once written, so they have no lifecycle. */
export const IMMUTABLE_RECORDS: readonly ImmutableRecord[] = [
  { record: 'Package version', storage: 'packageVersions', owner: '13.1' },
  { record: 'Comment revision', storage: 'commentRevisions', owner: '10.1' },
  { record: "A revision's Step Definitions", storage: 'templateRevisions', owner: '04.1' },
  { record: "A revision's Module Includes", storage: 'moduleLocks', owner: '06.1' },
  { record: 'Approval Decision', storage: 'approvalDecisions', owner: '10.2' },
  { record: 'Exception', storage: 'stepExceptions', owner: '08.3', note: 'Withdrawing one is a reopen.' },
  { record: 'Event', storage: 'events', owner: '12.1' },
  { record: 'Audit Entry', storage: 'auditEntries', owner: '12.2' },
  { record: 'Completion Record', storage: 'completionRecords', owner: '10.3', note: 'A newer record supersedes it.' },
];

export interface Aggregate {
  readonly name: string;
  /** The collection whose row carries `aggregateRevision`. */
  readonly root: string;
  readonly owner: LeafId;
  /** The fields and child collections a command on the aggregate changes. */
  readonly members: readonly string[];
  /** Fields of the root that never bump the counter. */
  readonly excludes: readonly string[];
}

/** 01.1's aggregates. Leaves may add more. Share Capability is not one. */
export const AGGREGATES: readonly Aggregate[] = [
  {
    name: 'Template Draft',
    root: 'blueprints',
    owner: '04.1',
    members: ['title', 'description', 'questions', 'resources', 'items'],
    excludes: ['owner', 'workspace', 'tags', 'category', 'visibility', 'instanceCount', 'ratingSum', 'ratingCount'],
  },
  { name: 'Run', root: 'instances', owner: '07.1', members: ['instances', 'instanceItems'], excludes: [] },
  { name: 'Account Preferences', root: 'accountPreferences', owner: '17.1', members: ['accountPreferences'], excludes: [] },
  { name: 'Schedule', root: 'schedules', owner: '08.2', members: ['schedules'], excludes: [] },
];

/**
 * Commands that check `aggregateRevision` before they write. `MoveStep` is
 * the reorder op. 11.1 bumps the counter once per accepted command.
 */
export const AGGREGATE_REVISION_CHECKS = [
  'PublishRevision',
  'CompleteRun',
  'ReopenRun',
  'CancelRun',
  'ApplyRunUpgrade',
  'MoveStep',
] as const satisfies readonly (CommandName | (typeof DRAFT_COMMANDS)[number])[];

/** Step commands check `stepRevision` and bump both counters. */
export const STEP_REVISION_CHECKS = ['SetStepState', 'DecideApproval'] as const satisfies readonly CommandName[];
