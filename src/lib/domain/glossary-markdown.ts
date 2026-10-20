/**
 * Renders docs/architecture/glossary.md, the readable form of the contract
 * files. vocabulary.test.ts fails when the committed file differs from this
 * output, and `npx tsx scripts/transformation/render.ts` rewrites it. Counts
 * and lists in the prose come from the data, so a data change can't leave
 * the text behind.
 */
import { DECISION_RECORDS, DOMAIN_CONTRACT_VERSION, leafIssue, type LeafId } from './contract';
import {
  AGGREGATES,
  COMMANDS,
  IMMUTABLE_RECORDS,
  MINIMUM_STATES,
  PRECONDITIONS,
  STATELESS_FIELDS,
  TRANSITION_TABLES,
  type Cause,
  type CommandName,
  type Lifecycle,
} from './lifecycles';
import { CLASS_RULES, COLLECTIONS, PURGES, RELATIONS, RETENTION_CLASSES, type PurgeKind, type RelationRetention } from './retention';
import {
  ACTION_LABELS,
  CAPABILITY_QUALIFIERS,
  DESTINATIONS,
  ENTITIES,
  KIND_KEYS,
  RETIRED_WORDS,
  ROUTE_MOVES,
  SUPPORTING_TERMS,
  type Storage,
  type Term,
} from './vocabulary';

/** The committed file, relative to the repository root. */
export const GLOSSARY_FILE = 'docs/architecture/glossary.md';

const REPO = 'https://github.com/keyurgolani/Checkmate';

/**
 * A leaf ID outside a code span: two digits, a dot and a leaf number, not
 * inside a longer number, a path or a `CHECKMATE-` name.
 */
const LEAF_ID = /(?<![\w.#/[-])\d{2}\.[1-4](?!\w|\.\d)/g;

/**
 * Turns every leaf ID on the page, outside code spans, into a link to its
 * issue: `04.1` becomes `[#38](…/issues/38) (CHECKMATE-04.1)`. An ID that
 * isn't a filed leaf throws.
 */
export function linkLeaves(markdown: string): string {
  const link = (id: string) => {
    const issue = leafIssue(id as LeafId);
    return `[#${issue}](${REPO}/issues/${issue}) (CHECKMATE-${id})`;
  };
  return markdown
    .split('\n')
    .map((line) =>
      line
        .split('`')
        .map((part, index) => (index % 2 === 1 ? part : part.replace(LEAF_ID, link)))
        .join('`'),
    )
    .join('\n');
}

/** A leaf as page text. `linkLeaves` turns it into a link. */
function leaf(id: LeafId): string {
  leafIssue(id);
  return id;
}

const NUMBER_WORDS = ['No', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve'];

/** A count that starts a sentence. */
function count(n: number): string {
  return NUMBER_WORDS[n] ?? String(n);
}

function code(text: string): string {
  return `\`${text}\``;
}

function list(items: readonly string[], conjunction: 'and' | 'or' = 'and'): string {
  if (items.length <= 1) return items.join('');
  return `${items.slice(0, -1).join(', ')} ${conjunction} ${items[items.length - 1]}`;
}

function table(header: readonly string[], rows: readonly (readonly string[])[]): string[] {
  return [
    `| ${header.join(' | ')} |`,
    `|${header.map(() => '---').join('|')}|`,
    ...rows.map((row) => `| ${row.map((text) => text.replace(/\|/g, '\\|')).join(' | ')} |`),
  ];
}

function storageText(storage: Storage): string {
  let text = storage.name === null ? 'Not stored.' : code(storage.name);
  if (storage.status === 'planned') text += storage.addedBy ? `, which ${leaf(storage.addedBy)} adds` : ' (planned)';
  if (storage.movesTo) text += `, moving to ${code(storage.movesTo.name)} in ${leaf(storage.movesTo.by)}`;
  if (storage.note) text += storage.name === null ? ` ${storage.note}` : `. ${storage.note}`;
  return text;
}

function termRows(terms: readonly Term[]): string[][] {
  return terms.map((term) => [
    term.name,
    term.label ?? `Not shown. ${term.labelNote ?? ''}`.trim(),
    code(term.domainName),
    storageText(term.storage),
    leaf(term.owner),
    term.meaning,
  ]);
}

function causeText(cause: Cause): string {
  if (cause.kind === 'command') return cause.note ? `${code(cause.command)} (${cause.note})` : code(cause.command);
  return `${cause.kind === 'time' ? 'Time' : 'Derived'} (${cause.note})`;
}

function lifecycleSection(lifecycle: Lifecycle): string[] {
  const starts = new Map<string, string[]>();
  for (const entry of lifecycle.initial) starts.set(entry.state, [...(starts.get(entry.state) ?? []), causeText(entry.cause)]);
  const startText = [...starts].map(([state, causes]) => `${code(state)} by ${list(causes, 'or')}`).join('; ');

  const moves = new Map<string, { from: string; to: string; causes: string[] }>();
  for (const transition of lifecycle.transitions) {
    const key = `${transition.from} ${transition.to}`;
    const move = moves.get(key) ?? { from: transition.from, to: transition.to, causes: [] };
    move.causes.push(causeText(transition.cause));
    moves.set(key, move);
  }

  const terminal =
    lifecycle.terminal.length === 0 ? 'No state is terminal.' : `Nothing leaves ${list(lifecycle.terminal.map(code), 'or')}.`;
  return [
    `### ${lifecycle.entity} (${code(lifecycle.field)})`,
    '',
    [
      `Owner ${leaf(lifecycle.owner)}.`,
      lifecycle.note,
      `States: ${list(lifecycle.states.map(code))}.`,
      `A record starts as ${startText}.`,
      terminal,
    ]
      .filter((part) => part !== undefined)
      .join(' '),
    '',
    ...table(
      ['From', 'To', 'Cause'],
      [...moves.values()].map((move) => [code(move.from), code(move.to), move.causes.join('; ')]),
    ),
    '',
  ];
}

const PURGE_KINDS: readonly PurgeKind[] = ['account', 'workspace', 'template'];
const PURGE_NAMES: Readonly<Record<PurgeKind, string>> = { account: 'Account', workspace: 'Workspace', template: 'Template' };

function relationTarget(row: RelationRetention): string {
  const parts: string[] = [row.target === 'text-id' ? 'text ID' : row.target];
  if (row.nullable) parts.push('nullable');
  if (row.snapshot) parts.push(`${row.snapshot} snapshot`);
  if (row.withinRun) parts.push('inside its run');
  const text = parts.join(', ');
  return row.note ? `${text}. ${row.note}` : text;
}

function commandList(commands: readonly string[]): string {
  return list(commands.map(code));
}

const PRECONDITION_LABELS: Readonly<Record<keyof typeof PRECONDITIONS, string>> = {
  aggregateRevision: code('aggregateRevision'),
  stepRevision: code('stepRevision'),
  lastSeenValue: 'Last-seen value',
  none: 'None',
};

export function renderGlossary(): string {
  const softDeletes = PURGE_KINDS.map((kind) => PURGES[kind].after);
  const newRelations = RELATIONS.filter((row) => row.baseline === 'new').map((row) => code(row.relation));
  const keptCascades = RELATIONS.filter((row) => row.baseline === 'cascade' && row.target === 'cascade').length;
  const commandRows = (Object.keys(COMMANDS) as CommandName[]).map((name) => {
    const info: { owner: LeafId; note?: string } = COMMANDS[name];
    return [code(name), leaf(info.owner), info.note ?? ''];
  });

  const lines: string[] = [
    '# Glossary',
    '',
    '<!-- Generated from src/lib/domain/ by `npx tsx scripts/transformation/render.ts`. Do not edit; src/lib/domain/vocabulary.test.ts fails when this file is stale. -->',
    '',
    `Domain contract ${code(DOMAIN_CONTRACT_VERSION)}, from ${leaf('01.1')}. The files in [\`src/lib/domain/\`](../../src/lib/domain/) are the source, and this page is their readable form. A leaf cites the contract version it builds on.`,
    '',
    'Each term has one label (what people see), one domain name (code, commands and APIs), one storage name and one owning leaf. A storage name is what PocketBase holds today, or what a leaf will add. Legacy storage names stay behind one adapter until a migration renames them.',
    '',
    'Every link in the governing loop has an entry here: `Template → immutable revision → configured run → execution evidence → approvals → portable completion record`.',
    '',
    '## Entities',
    '',
    ...table(['Term', 'Label', 'Domain name', 'Storage', 'Owner', 'Meaning'], termRows(ENTITIES)),
    '',
    '## Supporting terms',
    '',
    ...table(['Term', 'Label', 'Domain name', 'Storage', 'Owner', 'Meaning'], termRows(SUPPORTING_TERMS)),
    '',
    '## Step kinds',
    '',
    'Kind keys are permanent once 04.1 writes revisions.',
    '',
    ...table(['Kind', 'Owner', 'Meaning'], KIND_KEYS.map((kind) => [code(kind.key), leaf(kind.owner), kind.meaning])),
    '',
    '## Retired words',
    '',
    'These are no longer entity, alias or UI words. Storage names stay behind the adapter until a migration renames them.',
    '',
    ...table(['Word', 'Use', 'Note'], RETIRED_WORDS.map((word) => [word.word, word.use, word.note])),
    '',
    '## Capability',
    '',
    '"Capability" always takes a qualifier.',
    '',
    ...table(['Term', 'Owner', 'Meaning'], CAPABILITY_QUALIFIERS.map((item) => [item.term, leaf(item.owner), item.meaning])),
    '',
    '## Navigation',
    '',
    `${count(DESTINATIONS.length)} destinations, in this order. ${leaf('21.1')} builds the nav registry from these IDs, labels and order.`,
    '',
    ...table(
      ['ID', 'Label', 'Route', 'Holds'],
      DESTINATIONS.map((destination) => [code(destination.id), destination.label, code(destination.route), destination.holds]),
    ),
    '',
    'Each move is a permanent 308 redirect for the path and every path under it, print routes included.',
    '',
    ...table(['From', 'To', 'Added by'], ROUTE_MOVES.map((move) => [code(move.from), code(move.to), leaf(move.by)])),
    '',
    'Action labels. N is the revision number.',
    '',
    ...table(['Label', 'Command', 'Owner'], ACTION_LABELS.map((action) => [action.label, code(action.command), leaf(action.owner)])),
    '',
    '## Commands',
    '',
    `Every command this contract names, with the leaf that builds it. The matrix rows in ${leaf('01.2')} use these names.`,
    '',
    ...table(['Command', 'Owner', 'Note'], commandRows),
    '',
    '## Lifecycles',
    '',
    'Each transition names its command, or Time or Derived as its cause. An owner adds states and transitions with a minor bump, and removes or renames one only through a superseding decision record and a major bump.',
    '',
    ...TRANSITION_TABLES.flatMap(lifecycleSection),
    '### Other entities',
    '',
    'Owners extend these states and never contradict them.',
    '',
    ...table(
      ['Entity', 'Field', 'States', 'Owner', 'Note'],
      MINIMUM_STATES.map((row) => [
        row.entity,
        row.field === undefined ? '' : code(row.field),
        row.states.length === 0 ? 'Defined by the owner' : list(row.states.map(code)),
        leaf(row.owner),
        row.note ?? '',
      ]),
    ),
    '',
    `Blocked, overdue and offline are projection facets of a run, never statuses. Reopened is an event, never a state. ${list(STATELESS_FIELDS.map(code))} ${STATELESS_FIELDS.length === 1 ? 'carries' : 'carry'} no state.`,
    '',
    '### Immutable records',
    '',
    'These never change once written, so they have no lifecycle.',
    '',
    ...table(
      ['Record', 'Storage', 'Owner', 'Note'],
      IMMUTABLE_RECORDS.map((row) => [row.record, code(row.storage), leaf(row.owner), row.note ?? '']),
    ),
    '',
    '## Aggregates and counters',
    '',
    'Each aggregate carries `aggregateRevision`, which 11.1 bumps once per accepted command. It is never the revision `number`. Steps carry `stepRevision`, and a command that changes a step bumps both counters. Leaves may add aggregates. A Share Capability is not one.',
    '',
    ...table(
      ['Aggregate', 'Root', 'Members', 'Never bumps it', 'Owner'],
      AGGREGATES.map((row) => [
        row.name,
        code(row.root),
        list(row.members.map(code)),
        row.excludes.length === 0 ? '' : list(row.excludes.map(code)),
        leaf(row.owner),
      ]),
    ),
    '',
    'What each command checks before it writes, besides its idempotency key. `MoveStep` is the reorder op. `SetInclude` and `SetLock` are refused until 06.1, which sets their check, and a command not listed gets its check from its owner.',
    '',
    ...table(
      ['Check', 'Commands', 'Note'],
      (Object.keys(PRECONDITIONS) as (keyof typeof PRECONDITIONS)[]).map((check) => [
        PRECONDITION_LABELS[check],
        commandList(PRECONDITIONS[check].commands),
        PRECONDITIONS[check].note,
      ]),
    ),
    '',
    '## Retention',
    '',
    `${commandList(softDeletes)} are soft deletes. Only the system actor purges, with a job on the job runtime from ${leaf('12.1')} that records a receipt event.`,
    '',
    ...table(
      ['Purge', 'Owner', 'Follows', 'When'],
      PURGE_KINDS.map((kind) => [PURGE_NAMES[kind], leaf(PURGES[kind].owner), code(PURGES[kind].after), PURGES[kind].when]),
    ),
    '',
    'A tombstone keeps the id, a name snapshot and `purged`, and fires no cascade, so `restrict` targets never vanish and the purge job deletes `operational` rows itself. Relations from `history` and `proof` rows never cascade, except a run step\'s inside its run. Such a row keeps a display snapshot or reads the tombstone.',
    '',
    ...table(
      ['Class', 'Meaning', 'Purge rule', 'Account purge', 'Workspace purge', 'Template purge'],
      RETENTION_CLASSES.map((name) => [
        code(name),
        CLASS_RULES[name].meaning,
        CLASS_RULES[name].purge,
        ...PURGE_KINDS.map((kind) => CLASS_RULES[name].onPurge[kind]),
      ]),
    ),
    '',
    ...table(
      ['Collection', 'Class', 'Note'],
      COLLECTIONS.map((row) => [
        code(row.collection),
        code(row.class),
        [row.status === 'planned' ? `Planned, added by ${leaf(row.addedBy ?? '01.1')}.` : '', row.note ?? ''].filter(Boolean).join(' '),
      ]),
    ),
    '',
    `Every baseline relation${newRelations.length === 0 ? '' : `, ${list(newRelations)}`} and the planned relations. ${count(keptCascades)} baseline relations keep cascade.`,
    '',
    ...table(
      ['Relation', 'References', 'Baseline', 'Target', 'Executor'],
      RELATIONS.map((row) => [
        code(row.relation),
        code(row.references),
        row.baseline,
        relationTarget(row),
        row.executor === null ? 'unchanged' : leaf(row.executor),
      ]),
    ),
    '',
    '## Decision records',
    '',
    ...DECISION_RECORDS.map((record, index) => `${index + 1}. [${record.title}](decisions/${record.id}.md)`),
    '',
  ];
  return linkLeaves(lines.join('\n'));
}
