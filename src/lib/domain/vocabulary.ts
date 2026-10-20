/**
 * CHECKMATE-01.1 (#29): one label, domain name, storage name and owning leaf
 * for every PRODUCT.md entity and supporting term, plus kind keys, retired
 * words, navigation and action labels. docs/architecture/glossary.md is
 * rendered from this file and lifecycles.ts.
 */
import type { LeafId } from './contract';
import type { CommandName } from './lifecycles';

/**
 * `baseline`: in pb_schema.json at 9019d17. `planned`: named by the leaf that
 * adds it. `none`: computed on read, never stored.
 */
export type StorageStatus = 'baseline' | 'planned' | 'none';

export interface Storage {
  /** A collection, `collection.field`, or `collection.field = value`. Null only for `none`. */
  readonly name: string | null;
  readonly status: StorageStatus;
  /** The leaf that adds planned storage, when it is not the term's owner. */
  readonly addedBy?: LeafId;
  /** Where a leaf moves baseline storage. */
  readonly movesTo?: { readonly name: string; readonly by: LeafId };
  readonly note?: string;
}

export interface Term {
  /** As PRODUCT.md and #29 write it. */
  readonly name: string;
  /** What people see. Null for a term no screen shows; `labelNote` says why. */
  readonly label: string | null;
  readonly labelNote?: string;
  /** The name in code, commands and APIs. */
  readonly domainName: string;
  readonly storage: Storage;
  readonly owner: LeafId;
  readonly meaning: string;
  /** Baseline code or UI names this term retires. Storage names stay behind the adapter. */
  readonly replaces?: readonly string[];
}

const baseline = (name: string, extra: Omit<Storage, 'name' | 'status'> = {}): Storage => ({ name, status: 'baseline', ...extra });
const planned = (name: string, extra: Omit<Storage, 'name' | 'status'> = {}): Storage => ({ name, status: 'planned', ...extra });
const notStored = (note: string): Storage => ({ name: null, status: 'none', note });

/** The 23 entities of PRODUCT.md's governing product model, in its order. */
export const ENTITIES: readonly Term[] = [
  {
    name: 'Account',
    label: 'Account',
    domainName: 'Account',
    storage: baseline('users'),
    owner: '02.1',
    meaning: "A person's identity, sessions, security settings and personal preferences.",
  },
  {
    name: 'Secret Reference',
    label: 'Credential',
    domainName: 'SecretReference',
    storage: planned('secret_references', { addedBy: '00.2' }),
    owner: '02.2',
    meaning: 'Points to an encrypted provider or integration credential. The secret never sits in a profile or preference record.',
  },
  {
    name: 'Workspace',
    label: 'Workspace',
    domainName: 'Workspace',
    storage: baseline('workspaces'),
    owner: '03.1',
    meaning: 'Owns members, roles, policies, templates, runs and catalog installations.',
  },
  {
    name: 'Template',
    label: 'Template',
    domainName: 'Template',
    storage: baseline('blueprints'),
    owner: '04.1',
    meaning: 'The reusable workflow definition that a draft and its revisions belong to.',
    replaces: ['Blueprint'],
  },
  {
    name: 'Template Draft',
    label: 'Draft',
    domainName: 'TemplateDraft',
    storage: baseline('blueprints', { note: 'Draft fields on the template row, steps in `items`.' }),
    owner: '04.1',
    meaning: 'The editable copy of a template that its collaborators work on: its title, description, questions, resources and steps.',
  },
  {
    name: 'Template Revision',
    label: 'Revision',
    domainName: 'TemplateRevision',
    storage: planned('templateRevisions'),
    owner: '04.1',
    meaning: 'An immutable, numbered release of a draft. It can be addressed, diffed and rolled back to.',
  },
  {
    name: 'Step Definition',
    label: 'Step',
    domainName: 'StepDefinition',
    storage: baseline('items', { note: 'Draft steps. A revision keeps its steps in its own document.' }),
    owner: '05.1',
    meaning:
      'One schema-validated step in a draft or revision, such as an action, instruction, field, decision, evidence request, approval, automation, section or module include.',
    replaces: ['Item'],
  },
  {
    name: 'Module Include',
    label: 'Module include',
    domainName: 'ModuleInclude',
    storage: planned('moduleLocks', { note: 'The include is a `module-include@1` step; the lock pins its revision.' }),
    owner: '06.1',
    meaning: "Includes one published revision of another template, with parameters and role slots, and keeps that revision's provenance.",
  },
  {
    name: 'Run',
    label: 'Run',
    domainName: 'Run',
    storage: baseline('instances'),
    owner: '07.1',
    meaning: 'One execution of one template revision, with its inputs, role bindings, schedule and status.',
    replaces: ['Checklist', 'Instance'],
  },
  {
    name: 'Run Step',
    label: 'Step',
    domainName: 'RunStep',
    storage: baseline('instanceItems'),
    owner: '07.1',
    meaning: 'One step of a run. It keeps the source revision and Step Key of the step it came from.',
    replaces: ['ChecklistItem', 'InstanceItem', 'Task'],
  },
  {
    name: 'Participant',
    label: 'Participant',
    domainName: 'Participant',
    storage: planned('runParticipants'),
    owner: '03.2',
    meaning: 'A person, guest, service, automation or agent admitted to a run with a role.',
  },
  {
    name: 'Assignment',
    label: 'Assignment',
    domainName: 'Assignment',
    storage: planned('assignments'),
    owner: '08.1',
    meaning: 'Names who should do one run step: a participant or a role slot.',
  },
  {
    name: 'Evidence',
    label: 'Evidence',
    domainName: 'Evidence',
    storage: planned('evidence'),
    owner: '10.1',
    meaning: 'A value or file submitted for a run step, kept as its own record.',
  },
  {
    name: 'Comment',
    label: 'Comment',
    domainName: 'Comment',
    storage: planned('comments'),
    owner: '10.1',
    meaning: 'A note on a run step. Each edit adds a comment revision.',
  },
  {
    name: 'Approval Decision',
    label: 'Approval decision',
    domainName: 'ApprovalDecision',
    storage: planned('approvalDecisions'),
    owner: '10.2',
    meaning: "An approver's approve, reject or rescind on an approval step, bound to the evidence on record.",
  },
  {
    name: 'Exception',
    label: 'Exception',
    domainName: 'Exception',
    storage: planned('stepExceptions'),
    owner: '08.3',
    meaning: 'The recorded reason a run step was skipped, not applicable or done differently. An excepted step counts as done.',
  },
  {
    name: 'Event',
    label: 'Event',
    domainName: 'Event',
    storage: planned('events'),
    owner: '12.1',
    meaning: 'An immutable record of one accepted change, with its actor, time, cause and what changed.',
  },
  {
    name: 'Audit Entry',
    label: 'Audit entry',
    domainName: 'AuditEntry',
    storage: planned('auditEntries'),
    owner: '12.2',
    meaning: "A workspace's audit record of one event, kept for the workspace's retention period.",
    replaces: ['ActivityLog'],
  },
  {
    name: 'Share Capability',
    label: 'Share link',
    domainName: 'ShareCapability',
    storage: planned('shareCapabilities'),
    owner: '03.3',
    meaning: 'A revocable, expiring link that grants one declared view and its actions on a template, run, progress view or completion record.',
  },
  {
    name: 'Catalog Package',
    label: 'Package',
    domainName: 'CatalogPackage',
    storage: planned('packageVersions'),
    owner: '13.1',
    meaning: 'Signed, versioned template revisions with their dependencies, permissions, compatibility and provenance.',
  },
  {
    name: 'Schedule',
    label: 'Schedule',
    domainName: 'Schedule',
    storage: planned('schedules'),
    owner: '08.2',
    meaning: 'Creates runs at set times, one per occurrence, however often delivery retries.',
  },
  {
    name: 'Automation Definition',
    label: 'Automation',
    domainName: 'AutomationDefinition',
    storage: planned('automations'),
    owner: '15.3',
    meaning: 'A saved automation that acts only through declared commands, with durable delivery that never repeats an effect.',
  },
  {
    name: 'Completion Record',
    label: 'Completion record',
    domainName: 'CompletionRecord',
    storage: planned('completionRecords'),
    owner: '10.3',
    meaning: 'Immutable, portable proof of a completed run: its revision, inputs, decisions, evidence, actors and events.',
  },
];

/** #29's supporting terms, in its order, then the terms 01.1 defines. */
export const SUPPORTING_TERMS: readonly Term[] = [
  {
    name: 'Membership',
    label: 'Member',
    domainName: 'Membership',
    storage: planned('memberships'),
    owner: '03.1',
    meaning: "A principal's role in a workspace.",
  },
  {
    name: 'Grant',
    label: 'Shared access',
    domainName: 'Grant',
    storage: baseline('collaborators', { movesTo: { name: 'memberships', by: '03.1' } }),
    owner: '03.1',
    meaning: "A person's role on one template, without a workspace membership.",
    replaces: ['Collaborator'],
  },
  {
    name: 'Invitation',
    label: 'Invitation',
    domainName: 'Invitation',
    storage: baseline('collaborators.acceptedAt', {
      movesTo: { name: 'invitations', by: '03.1' },
      note: 'Pending while `acceptedAt` is empty.',
    }),
    owner: '03.1',
    meaning: 'An offer of a membership or grant that the invitee accepts, declines or lets expire.',
  },
  {
    name: 'Guest',
    label: 'Guest',
    domainName: 'Guest',
    storage: planned('runParticipants.principalKind = guest'),
    owner: '03.2',
    meaning: 'A run participant without an account, limited to that run.',
  },
  {
    name: 'Parameter',
    label: 'Input',
    domainName: 'Parameter',
    storage: baseline('blueprints.questions', { movesTo: { name: 'blueprints.parameters', by: '06.2' } }),
    owner: '06.2',
    meaning: 'A typed input a run supplies when it starts.',
    replaces: ['TemplateQuestion'],
  },
  {
    name: 'Role Slot',
    label: 'Role',
    domainName: 'RoleSlot',
    storage: planned('blueprints.roleSlots'),
    owner: '06.2',
    meaning: 'A named role in a template that performs or approves steps. A run binds people to it.',
  },
  {
    name: 'Condition',
    label: 'Condition',
    domainName: 'Condition',
    storage: baseline('items.metadata.conditions'),
    owner: '08.3',
    meaning: "An expression over a run's inputs that decides whether a step is in the run.",
  },
  {
    name: 'Module',
    label: 'Module',
    domainName: 'Module',
    storage: baseline('blueprints'),
    owner: '06.1',
    meaning: 'A template whose published revisions other templates can include.',
  },
  {
    name: 'Installation',
    label: 'Installation',
    domainName: 'Installation',
    storage: planned('installations', { addedBy: '13.1' }),
    owner: '13.3',
    meaning: "A workspace's use of one package version. It grants read and run on the version's locked revisions and copies nothing.",
  },
  {
    name: 'Fork',
    label: 'Fork',
    domainName: 'Fork',
    storage: planned('blueprints.forkedFrom'),
    owner: '13.3',
    meaning: 'A new template made from an installed package version. It keeps the Step Keys and records its source.',
  },
  {
    name: 'Quarantine',
    label: 'Quarantine',
    domainName: 'Quarantine',
    storage: planned('catalogListings.quarantined', { addedBy: '13.1' }),
    owner: '13.3',
    meaning: 'A hold on a package version that blocks new installs and runs. Runs already started continue.',
  },
  {
    name: 'Progress View',
    label: 'Progress view',
    domainName: 'ProgressView',
    storage: notStored('A projection, `run-progress@1`.'),
    owner: '03.3',
    meaning: "A read-only view of one run's progress that a share link can show.",
  },
  {
    name: 'Report',
    label: 'Report',
    domainName: 'Report',
    storage: notStored('Event-derived projections, one per definition version.'),
    owner: '12.3',
    meaning: 'A versioned definition of figures computed from events.',
  },
  {
    name: 'Notification',
    label: 'Notification',
    domainName: 'Notification',
    storage: baseline('notifications', { movesTo: { name: 'inboxItems', by: '12.2' } }),
    owner: '12.2',
    meaning: 'A message to one recipient about an event.',
  },
  {
    name: 'Account Preferences',
    label: 'Preferences',
    domainName: 'AccountPreferences',
    storage: baseline('users.preferences', { movesTo: { name: 'accountPreferences', by: '17.1' } }),
    owner: '17.1',
    meaning: "An account's presentation and notification settings. It never holds a secret.",
  },
  {
    name: 'Principal',
    label: null,
    labelNote: "Screens show the actor's name.",
    domainName: 'Principal',
    storage: notStored('Resolved per request. Records keep it as `actorKind` and `actorId`.'),
    owner: '01.2',
    meaning: 'Who a request acts as, such as an account, a guest, a link holder, a service, an automation, an agent or the system.',
  },
  {
    name: 'Step Key',
    label: 'Step key',
    domainName: 'stepKey',
    storage: planned('items.stepKey', { addedBy: '04.1', note: 'Run steps keep it in `instanceItems.stepKey` (07.2).' }),
    owner: '01.1',
    meaning: "A step's stable, opaque identity across edits, revisions, copies, forks, exports and runs.",
  },
  {
    name: 'Lineage',
    label: null,
    labelNote: 'Used only to match steps.',
    domainName: 'Lineage',
    storage: notStored('Follows revisions, copies and forks.'),
    owner: '01.1',
    meaning: "A template's revisions plus the copies and forks made from them. Step Keys match only within one lineage.",
  },
  {
    name: 'Aggregate revision',
    label: null,
    labelNote: 'Sent as an ETag.',
    domainName: 'aggregateRevision',
    storage: planned('aggregateRevision', { addedBy: '11.1', note: 'On `blueprints` (Template Draft) and `instances` (Run).' }),
    owner: '01.1',
    meaning: 'Counts accepted commands on one aggregate. It is never the revision number.',
  },
  {
    name: 'Step revision',
    label: null,
    labelNote: 'Sent as an ETag.',
    domainName: 'stepRevision',
    storage: planned('stepRevision', { addedBy: '11.1', note: 'On `items` and `instanceItems`.' }),
    owner: '01.1',
    meaning: "Counts accepted commands on one step, so edits to different steps don't conflict.",
  },
  {
    name: 'Update Notice',
    label: 'Update available',
    domainName: 'UpdateNotice',
    storage: planned('updateNotices', { addedBy: '06.3' }),
    owner: '01.1',
    meaning: 'Says a newer revision exists for an installation, include lock or run, from one revision to another.',
  },
  {
    name: 'Deferral',
    label: 'Deferral',
    domainName: 'Deferral',
    storage: planned('upgradeDeferrals', { addedBy: '06.3' }),
    owner: '01.1',
    meaning: 'Postpones one update notice, with an actor, a reason and an expiry. When it expires the notice is open again.',
  },
  {
    name: 'Projection',
    label: null,
    labelNote: 'Screens show its content.',
    domainName: 'Projection',
    storage: notStored('A read model, by default a bounded indexed query (18.1).'),
    owner: '01.1',
    meaning: 'An authorized server read model. Only audit, reports and catalog aggregates are built from events.',
  },
];

export const TERMS: readonly Term[] = [...ENTITIES, ...SUPPORTING_TERMS];

/** The glossary term with this name, as other contract files and #31's map cite it. */
export function findTerm(name: string): Term | undefined {
  return TERMS.find((term) => term.name === name);
}

export interface KindKey {
  readonly key: string;
  readonly owner: LeafId;
  readonly meaning: string;
}

/** Step kind keys. They are permanent once 04.1 writes revisions. */
export const KIND_KEYS: readonly KindKey[] = [
  { key: 'task@1', owner: '05.2', meaning: 'An action someone does and checks off. Shown as Action.' },
  { key: 'instruction@1', owner: '05.2', meaning: 'Text to read. Nothing to check off.' },
  { key: 'section@1', owner: '05.2', meaning: 'Groups steps. Replaces phases.' },
  {
    key: 'legacy-reference@1',
    owner: '05.2',
    meaning: "A baseline reference to another template. Run creation resolves it to the target's current published revision.",
  },
  { key: 'module-include@1', owner: '06.1', meaning: 'Includes one locked revision of a module.' },
  { key: 'decision@1', owner: '08.3', meaning: 'Pick one of a set of options.' },
  { key: 'field@1', owner: '10.1', meaning: 'Record a value.' },
  { key: 'evidence-request@1', owner: '10.1', meaning: 'Ask for evidence, such as a photo or a file.' },
  { key: 'approval@1', owner: '10.2', meaning: 'Approve the steps it names before the run can complete.' },
  { key: 'automation@1', owner: '15.3', meaning: 'A step an automation performs.' },
];

export interface RetiredWord {
  readonly word: string;
  readonly use: string;
  readonly note: string;
}

/** Words retired as entity, alias and UI words. Storage names stay behind the adapter until a migration renames them. */
export const RETIRED_WORDS: readonly RetiredWord[] = [
  {
    word: 'Blueprint',
    use: 'Template',
    note: 'Survives only as the name of the YAML or JSON file form (16.3).',
  },
  {
    word: 'Checklist',
    use: 'Run',
    note: 'Run is the domain, API and navigation term. Plain-language copy may still say checklist.',
  },
  { word: 'Instance', use: 'Run', note: 'Storage keeps `instances` and `instance` for now.' },
  { word: 'ChecklistItem', use: 'Run Step', note: 'Code name today.' },
  { word: 'InstanceItem', use: 'Run Step', note: 'Storage keeps `instanceItems` for now.' },
  {
    word: 'Task',
    use: 'Step',
    note: 'The kind key `task@1` stays and is shown as Action.',
  },
  { word: 'Item', use: 'Step', note: 'Storage keeps `items` for now.' },
  { word: 'Module Package', use: 'Module or Catalog Package', note: 'A module is a template; a package is what the catalog signs and versions.' },
  { word: 'Phase', use: 'Section', note: 'Storage keeps the `phase` item type until 05.2 retires the column.' },
];

export interface QualifiedCapability {
  readonly term: string;
  readonly owner: LeafId;
  readonly meaning: string;
}

/** "Capability" always takes one of these qualifiers. */
export const CAPABILITY_QUALIFIERS: readonly QualifiedCapability[] = [
  { term: 'Share Capability', owner: '03.3', meaning: 'What a share link lets its holder see and do.' },
  { term: 'Step capability', owner: '05.1', meaning: 'A registered step kind and version, such as `task@1`.' },
  { term: 'Provider capability', owner: '14.1', meaning: 'What an AI or integration provider supports, found by negotiation.' },
  { term: 'Package requirement capability', owner: '13.1', meaning: "A step kind a package needs, listed in its `requires`." },
];

export interface Destination {
  readonly id: string;
  readonly label: string;
  readonly route: string;
  readonly holds: string;
}

/** The seven navigation destinations, in order. 21.1 builds the nav registry from these IDs, labels and order. */
export const DESTINATIONS: readonly Destination[] = [
  {
    id: 'today',
    label: 'Today',
    route: '/today',
    holds: 'Work that needs you now: assigned, due, blocked, awaiting approval and recently resumed.',
  },
  { id: 'library', label: 'Library', route: '/library', holds: 'Templates you own, shared with you, installed or public.' },
  { id: 'runs', label: 'Runs', route: '/runs', holds: 'Active, scheduled, completed, blocked and offline runs.' },
  { id: 'workspaces', label: 'Workspaces', route: '/workspaces', holds: 'People, roles, policy, integrations and workspace activity.' },
  { id: 'catalog', label: 'Catalog', route: '/catalog', holds: 'Discovery, trust, dependencies, installation and updates.' },
  { id: 'activity', label: 'Activity', route: '/activity', holds: 'Event history, notifications, reports and completion records.' },
  { id: 'settings', label: 'Settings', route: '/settings', holds: 'Profile, appearance, integrations, security and deployment.' },
];

export interface RouteMove {
  readonly from: string;
  readonly to: string;
  readonly by: LeafId;
}

/**
 * Permanent 308 redirects. Each covers the path and every path under it,
 * print routes included. 21.2 adds all but `/dashboard`, which 08.1 slice 0
 * adds with Today.
 */
export const ROUTE_MOVES: readonly RouteMove[] = [
  { from: '/dashboard', to: '/today', by: '08.1' },
  { from: '/templates', to: '/library', by: '21.2' },
  { from: '/checklists', to: '/runs', by: '21.2' },
  { from: '/discover', to: '/catalog', by: '21.2' },
  { from: '/reports', to: '/activity/reports', by: '21.2' },
  { from: '/profile', to: '/settings/profile', by: '21.2' },
];

/** Where a baseline path moves, or null when no move covers it. */
export function movedPath(path: string): string | null {
  for (const move of ROUTE_MOVES) {
    if (path === move.from || path.startsWith(`${move.from}/`)) return move.to + path.slice(move.from.length);
  }
  return null;
}

export interface ActionLabel {
  readonly label: string;
  readonly command: CommandName;
  readonly owner: LeafId;
}

/** Labels for the actions that release, start and publish. N is the revision number. */
export const ACTION_LABELS: readonly ActionLabel[] = [
  { label: 'Release revision N', command: 'PublishRevision', owner: '04.1' },
  { label: 'Start run', command: 'CreateRun', owner: '07.1' },
  { label: 'Release revision N and start', command: 'StartRunFromDraft', owner: '07.1' },
  { label: 'Publish to catalog', command: 'PublishToCatalog', owner: '13.1' },
];
