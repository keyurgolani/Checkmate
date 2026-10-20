/**
 * CHECKMATE-01.1 · contracts (#29), test plan item 3: no transition leaves a
 * terminal or immutable state, each names its command or `time` or `derived`,
 * every state is reachable, and Run Step has every state and inclusion value
 * that 07.3, 08.3, 09.1, 10.2 and 10.3 name. Also pins #29's own rules and
 * the minimum states of the other entities.
 */
import { describe, expect, it } from 'vitest';
import { leafIssue } from './contract';
import {
  AGGREGATES,
  COMMANDS,
  DRAFT_COMMANDS,
  IMMUTABLE_RECORDS,
  LIFECYCLES,
  MINIMUM_STATES,
  PRECONDITIONS,
  RUN_FACETS,
  STATELESS_FIELDS,
  TRANSITION_TABLES,
  type CommandName,
  type Lifecycle,
} from './lifecycles';
import { findTerm } from './vocabulary';

const tableName = (lifecycle: Lifecycle) => `${lifecycle.entity} (${lifecycle.field})`;
const TABLES = TRANSITION_TABLES.map((lifecycle) => [tableName(lifecycle), lifecycle] as const);

function reachable(lifecycle: Lifecycle): Set<string> {
  const seen = new Set(lifecycle.initial.map((entry) => entry.state));
  const queue = [...seen];
  for (let next = queue.shift(); next !== undefined; next = queue.shift()) {
    for (const transition of lifecycle.transitions) {
      if (transition.from === next && !seen.has(transition.to)) {
        seen.add(transition.to);
        queue.push(transition.to);
      }
    }
  }
  return seen;
}

/** The commands that move `from` to `to` in a table. */
function causes(lifecycle: Lifecycle, from: string, to: string): string[] {
  return lifecycle.transitions
    .filter((transition) => transition.from === from && transition.to === to)
    .map((transition) => (transition.cause.kind === 'command' ? transition.cause.command : transition.cause.kind));
}

/** The pairs a table allows out of `from`. */
function exits(lifecycle: Lifecycle, from: string): string[] {
  return [...new Set(lifecycle.transitions.filter((transition) => transition.from === from).map((transition) => transition.to))].sort();
}

describe('every transition table', () => {
  it('has five lifecycles, with Run Step tracking state and inclusion', () => {
    expect(Object.keys(LIFECYCLES)).toEqual(['templateDraft', 'templateRevision', 'run', 'runStep', 'shareCapability']);
    expect(TRANSITION_TABLES.map(tableName)).toEqual([
      'Template Draft (blueprints.draftState)',
      'Template Revision (templateLifecycleDecisions)',
      'Run (instances.status)',
      'Run Step (instanceItems.state)',
      'Run Step (instanceItems.inclusion)',
      'Share Capability (shareCapabilities)',
    ]);
  });

  it.each(TABLES)('%s names a glossary entity and a filed owner', (_name, lifecycle) => {
    expect(findTerm(lifecycle.entity)).toBeDefined();
    expect(() => leafIssue(lifecycle.owner)).not.toThrow();
  });

  it.each(TABLES)('%s uses only its own states', (_name, lifecycle) => {
    const states = new Set(lifecycle.states);
    expect(states.size).toBe(lifecycle.states.length);
    for (const entry of lifecycle.initial) expect(states).toContain(entry.state);
    for (const state of lifecycle.terminal) expect(states).toContain(state);
    for (const transition of lifecycle.transitions) {
      expect(states).toContain(transition.from);
      expect(states).toContain(transition.to);
      expect(transition.from, 'a transition changes the state').not.toBe(transition.to);
    }
  });

  it.each(TABLES)('%s never leaves a terminal state', (_name, lifecycle) => {
    for (const state of lifecycle.terminal) expect(exits(lifecycle, state), state).toEqual([]);
  });

  it.each(TABLES)('%s names a command, or time or derived, for every transition and start', (_name, lifecycle) => {
    for (const { cause } of [...lifecycle.transitions, ...lifecycle.initial]) {
      if (cause.kind === 'command') expect(Object.keys(COMMANDS)).toContain(cause.command);
      else expect(cause.note.length, `${cause.kind} needs a note`).toBeGreaterThan(0);
    }
  });

  it.each(TABLES)('%s reaches every state from a starting state', (_name, lifecycle) => {
    expect([...reachable(lifecycle)].sort()).toEqual([...lifecycle.states].sort());
  });

  it('gives immutable records no lifecycle and no states', () => {
    const withStates = new Set([...TRANSITION_TABLES.map((lifecycle) => lifecycle.entity), ...MINIMUM_STATES.map((row) => row.entity)]);
    for (const record of IMMUTABLE_RECORDS) expect(withStates.has(record.record), record.record).toBe(false);
  });

  it('never uses a projection facet, an event or a stateless field as a state', () => {
    const states = new Set([...TRANSITION_TABLES.flatMap((lifecycle) => lifecycle.states), ...MINIMUM_STATES.flatMap((row) => row.states)]);
    for (const value of [...RUN_FACETS, 'reopened']) expect(states.has(value), value).toBe(false);
    for (const field of STATELESS_FIELDS) expect(TRANSITION_TABLES.map((lifecycle) => lifecycle.field)).not.toContain(field);
  });
});

describe('Template Draft and Revision', () => {
  const draft = LIFECYCLES.templateDraft;
  const revision = LIFECYCLES.templateRevision;

  it('starts a draft new; PublishRevision makes a new or dirty draft clean; any DraftCommand makes it dirty', () => {
    expect(draft.initial.map((entry) => entry.state)).toEqual(['new']);
    expect(causes(draft, 'new', 'clean')).toContain('PublishRevision');
    expect(causes(draft, 'dirty', 'clean')).toContain('PublishRevision');
    expect(causes(draft, 'new', 'dirty')).toEqual(['DraftCommand']);
    expect(causes(draft, 'clean', 'dirty')).toEqual(['DraftCommand', 'RestoreRevisionToDraft']);
  });

  it('lets a rollback restore leave the draft clean (04.3)', () => {
    expect(causes(draft, 'dirty', 'clean')).toEqual(['PublishRevision', 'StartRunFromDraft', 'RestoreRevisionToDraft']);
    expect(COMMANDS.RestoreRevisionToDraft.owner).toBe('04.3');
  });

  it('keeps a revision published or deprecated', () => {
    expect(revision.states).toEqual(['published', 'deprecated']);
    expect(causes(revision, 'published', 'deprecated')).toEqual(['DeprecateRevision']);
  });
});

describe('Run', () => {
  const run = LIFECYCLES.run;

  it('moves scheduled to active at start', () => {
    expect(causes(run, 'scheduled', 'active')).toEqual(['SetStepState']);
  });

  it('completes only through CompleteRun, and only ReopenRun reverses it', () => {
    const into = run.transitions.filter((transition) => transition.to === 'completed');
    expect(into.map((transition) => (transition.cause.kind === 'command' ? transition.cause.command : transition.cause.kind))).toEqual([
      'CompleteRun',
      'CompleteRun',
    ]);
    expect(exits(run, 'completed')).toEqual(['active']);
    expect(causes(run, 'completed', 'active')).toEqual(['ReopenRun']);
  });

  it('lets a scheduled run with no executable steps complete without starting', () => {
    expect(causes(run, 'scheduled', 'completed')).toEqual(['CompleteRun']);
    expect(causes(run, 'active', 'completed')).toEqual(['CompleteRun']);
  });

  it('makes cancelled terminal through CancelRun', () => {
    expect(run.terminal).toEqual(['cancelled']);
    expect(causes(run, 'active', 'cancelled')).toEqual(['CancelRun']);
    expect(causes(run, 'scheduled', 'cancelled')).toEqual(['CancelRun']);
  });
});

describe('Run Step', () => {
  const state = LIFECYCLES.runStep.state;
  const inclusion = LIFECYCLES.runStep.inclusion;

  /** The state and inclusion values each leaf's body names (#49, #52, #53, #57, #58). */
  const NAMED_BY: Record<string, { state: string[]; inclusion: string[] }> = {
    '07.3': { state: ['pending', 'completed', 'excepted'], inclusion: ['included', 'retired'] },
    '08.3': { state: ['pending', 'completed', 'excepted', 'awaiting_approval', 'invalidated'], inclusion: ['included', 'retired', 'excluded'] },
    '09.1': { state: ['pending', 'completed', 'excepted', 'awaiting_approval', 'invalidated'], inclusion: [] },
    '10.2': { state: ['pending', 'completed', 'excepted', 'awaiting_approval', 'invalidated'], inclusion: ['excluded'] },
    '10.3': { state: ['pending', 'awaiting_approval', 'invalidated'], inclusion: [] },
  };

  it.each(Object.entries(NAMED_BY))('has every value %s names', (_leaf, named) => {
    for (const value of named.state) expect(state.states).toContain(value);
    for (const value of named.inclusion) expect(inclusion.states).toContain(value);
  });

  it('changes state only through SetStepState, DecideApproval or a causing command', () => {
    const allowed: CommandName[] = ['SetStepState', 'DecideApproval', 'ApplyRunUpgrade'];
    for (const transition of state.transitions) {
      expect(transition.cause.kind).toBe('command');
      if (transition.cause.kind === 'command') expect(allowed).toContain(transition.cause.command);
    }
    expect(Object.keys(COMMANDS)).not.toContain('CompleteRunStep');
    expect(Object.keys(COMMANDS)).not.toContain('ReopenRunStep');
  });

  it('follows #29: pending, awaiting_approval, then completed or excepted, with reopen and invalidation', () => {
    expect(exits(state, 'pending')).toEqual(['awaiting_approval', 'completed', 'excepted']);
    for (const to of ['awaiting_approval', 'completed', 'excepted']) expect(causes(state, 'pending', to)).toEqual(['SetStepState']);
    expect(causes(state, 'awaiting_approval', 'completed')).toEqual(['DecideApproval']);
    expect(causes(state, 'awaiting_approval', 'pending')).toEqual(['DecideApproval']);
    for (const from of ['completed', 'excepted']) {
      // A reopen, a rejected approval's subject reopen, or an upgrade's reconfirm (#49, #57).
      expect(causes(state, from, 'pending').sort()).toEqual(['ApplyRunUpgrade', 'DecideApproval', 'SetStepState']);
    }
    expect(causes(state, 'completed', 'invalidated').sort()).toEqual(['ApplyRunUpgrade', 'DecideApproval', 'SetStepState']);
    expect(exits(state, 'invalidated')).toEqual(['pending']);
    expect(causes(state, 'invalidated', 'pending')).toEqual(['SetStepState']);
  });

  it('invalidates an excepted step only through an upgrade, since an approval step is never excepted (#57)', () => {
    expect(causes(state, 'excepted', 'invalidated')).toEqual(['ApplyRunUpgrade']);
  });

  it('keeps inclusion included, retired (07.3) or excluded (08.3)', () => {
    expect(inclusion.states).toEqual(['included', 'retired', 'excluded']);
    expect(inclusion.owner).toBe('07.3');
  });

  it('retires a step the new revision drops, whether it was included or excluded (#49)', () => {
    expect(causes(inclusion, 'included', 'retired')).toEqual(['ApplyRunUpgrade']);
    expect(causes(inclusion, 'excluded', 'retired')).toEqual(['ApplyRunUpgrade']);
    expect(exits(inclusion, 'excluded')).toEqual(['included', 'retired']);
  });
});

describe('Share Capability', () => {
  const link = LIFECYCLES.shareCapability;

  it('derives suspended from the creator lacking authority, and back to active', () => {
    expect(causes(link, 'active', 'suspended')).toEqual(['derived']);
    expect(causes(link, 'suspended', 'active')).toEqual(['derived']);
  });

  it('makes revoked, expired, target_missing and restore_invalidated terminal', () => {
    expect([...link.terminal].sort()).toEqual(['expired', 'restore_invalidated', 'revoked', 'target_missing']);
    for (const from of ['active', 'suspended']) {
      expect(causes(link, from, 'revoked').sort()).toEqual([
        'DeleteAccount',
        'DeleteWorkspace',
        'RevokeAllShareCapabilities',
        'RevokeShareCapability',
      ]);
      expect(causes(link, from, 'expired')).toEqual(['time']);
    }
  });
});

describe('other entities', () => {
  /** The minimum states #29 lists under "Other entities". */
  const EXPECTED: Record<string, string[]> = {
    Account: ['active', 'deletion_pending', 'purged'],
    Workspace: ['active', 'archived', 'deletion_pending', 'purged'],
    'Secret Reference': ['active', 'unusable', 'revoked'],
    Template: ['active', 'deprecated', 'archived'],
    Participant: ['active', 'suspended', 'revoked', 'expired'],
    Assignment: ['assigned', 'claimed', 'released', 'unassigned', 'closed'],
    Invitation: ['pending', 'accepted', 'expired', 'revoked'],
    Evidence: ['attached', 'superseded'],
    'Catalog Package': ['listed', 'unlisted'],
    Installation: ['installed', 'quarantined', 'removed'],
    Schedule: ['active', 'paused', 'ended'],
    'Automation Definition': ['inactive', 'active', 'paused', 'suspended', 'archived'],
    'Update Notice': ['open', 'deferred', 'applied', 'superseded'],
    Comment: [],
  };

  it('lists the minimum states #29 gives each entity', () => {
    expect(Object.fromEntries(MINIMUM_STATES.map((row) => [row.entity, [...row.states]]))).toEqual(EXPECTED);
  });

  it('names glossary terms with filed owners, and explains any empty list', () => {
    for (const row of MINIMUM_STATES) {
      expect(findTerm(row.entity), row.entity).toBeDefined();
      expect(() => leafIssue(row.owner)).not.toThrow();
      if (row.states.length === 0) expect(row.note, row.entity).toBeTruthy();
    }
  });
});

describe('commands', () => {
  it('includes the upgrade and run commands #30 adds rows for', () => {
    const owners = Object.fromEntries(Object.entries(COMMANDS).map(([name, info]) => [name, info.owner]));
    expect(owners).toMatchObject({
      PlanRunUpgrade: '07.3',
      ApplyRunUpgrade: '07.3',
      DeferRunUpgrade: '07.3',
      CompleteRun: '09.1',
      ReopenRun: '09.1',
      CancelRun: '09.1',
      SetStepState: '09.1',
      DecideApproval: '10.2',
      StartRunFromDraft: '07.1',
    });
  });

  it('gives every command a filed owner', () => {
    for (const info of Object.values(COMMANDS)) expect(() => leafIssue(info.owner)).not.toThrow();
  });
});

describe('aggregates and counters', () => {
  it('names the four aggregates #29 names, and no Share Capability', () => {
    expect(AGGREGATES.map((aggregate) => aggregate.name)).toEqual(['Template Draft', 'Run', 'Account Preferences', 'Schedule']);
    for (const aggregate of AGGREGATES) expect(findTerm(aggregate.name), aggregate.name).toBeDefined();
  });

  it('keeps owner, workspace, listing, counts and ratings out of the Template Draft', () => {
    const draft = AGGREGATES.find((aggregate) => aggregate.name === 'Template Draft');
    expect(draft?.members).toEqual(['title', 'description', 'questions', 'resources', 'items']);
    expect(draft?.excludes).toEqual(['owner', 'workspace', 'tags', 'category', 'visibility', 'instanceCount', 'ratingSum', 'ratingCount']);
  });

  const checked = Object.values(PRECONDITIONS).flatMap((entry): string[] => [...entry.commands]);

  it('names known commands, each under one check', () => {
    const known = new Set<string>([...Object.keys(COMMANDS), ...DRAFT_COMMANDS]);
    for (const name of checked) expect(known.has(name), name).toBe(true);
    expect(new Set(checked).size, 'a command has one check').toBe(checked.length);
  });

  it('checks aggregateRevision on publish, start from draft, restore, complete, reopen, cancel, upgrade and reorder (#38, #40, #47)', () => {
    expect([...PRECONDITIONS.aggregateRevision.commands]).toEqual([
      'PublishRevision',
      'StartRunFromDraft',
      'RestoreRevisionToDraft',
      'CompleteRun',
      'ReopenRun',
      'CancelRun',
      'ApplyRunUpgrade',
      'MoveStep',
    ]);
    expect(PRECONDITIONS.aggregateRevision.note).toMatch(/several ops/);
  });

  it('checks stepRevision on the commands that change one step, and the last-seen value on header fields (#38, #59)', () => {
    expect([...PRECONDITIONS.stepRevision.commands]).toEqual(['SetStepState', 'DecideApproval', 'UpdateStep', 'RemoveStep']);
    expect([...PRECONDITIONS.lastSeenValue.commands]).toEqual(['SetHeaderField', 'SetQuestion']);
    expect([...PRECONDITIONS.none.commands]).toEqual(['AddStep', 'CreateTemplateDraft', 'CreateRun']);
  });

  it('gives every draft op a check, except the two 06.1 enables', () => {
    for (const op of DRAFT_COMMANDS) {
      if (op === 'SetInclude' || op === 'SetLock') expect(checked, op).not.toContain(op);
      else expect(checked, op).toContain(op);
    }
  });
});
