/**
 * Renders docs/architecture/glossary.md, the readable form of the contract
 * files. vocabulary.test.ts fails when the committed file differs from this
 * output, and `npx tsx scripts/transformation/render.ts` rewrites it.
 */
import { DECISION_RECORDS, DOMAIN_CONTRACT_VERSION, leafIssue, type LeafId } from './contract';
import {
  AGGREGATES,
  AGGREGATE_REVISION_CHECKS,
  COMMANDS,
  IMMUTABLE_RECORDS,
  MINIMUM_STATES,
  STATELESS_FIELDS,
  STEP_REVISION_CHECKS,
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

function leaf(id: LeafId): string {
  return `[${id}](${REPO}/issues/${leafIssue(id)})`;
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
  if (storage.status === 'planned') text += storage.addedBy ? ` (planned, ${leaf(storage.addedBy)})` : ' (planned)';
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
  if (row.snapshot) parts.push(`${row.snapshot} snapshot`);
  if (row.withinRun) parts.push('inside its run');
  const text = parts.join(', ');
  return row.note ? `${text}. ${row.note}` : text;
}

function commandList(commands: readonly string[]): string {
  return list(commands.map(code));
}

export function renderGlossary(): string {
  const commandRows = (Object.keys(COMMANDS) as CommandName[]).map((name) => {
    const info: { owner: LeafId; note?: string } = COMMANDS[name];
    return [code(name), leaf(info.owner), info.note ?? ''];
  });

  const lines: string[] = [
    '# Glossary',
    '',
    '<!-- Generated from src/lib/domain/ by `npx tsx scripts/transformation/render.ts`. Do not edit; src/lib/domain/vocabulary.test.ts fails when this file is stale. -->',
    '',
    `Domain contract ${code(DOMAIN_CONTRACT_VERSION)}, from [CHECKMATE-01.1](${REPO}/issues/${leafIssue('01.1')}). The files in [\`src/lib/domain/\`](../../src/lib/domain/) are the source, and this page is their readable form. A leaf cites the contract version it builds on.`,
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
    `Seven destinations, in this order. ${leaf('21.1')} builds the nav registry from these IDs, labels and order.`,
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
    `Every command a lifecycle names, with the leaf that builds it. ${leaf('01.2')}'s matrix rows use these names.`,
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
      ['Entity', 'States', 'Owner', 'Note'],
      MINIMUM_STATES.map((row) => [row.entity, row.states.length === 0 ? 'Defined by the owner' : list(row.states.map(code)), leaf(row.owner), row.note ?? '']),
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
    'Each aggregate carries `aggregateRevision`, which 11.1 bumps once per accepted command. It is never the revision `number`. Steps carry `stepRevision`, and a step command checks it and bumps both counters, so edits to different steps never conflict. Leaves may add aggregates. A Share Capability is not one.',
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
    `${commandList(AGGREGATE_REVISION_CHECKS)} check \`aggregateRevision\`. \`MoveStep\` is the reorder op. ${commandList(STEP_REVISION_CHECKS)} check \`stepRevision\`, as every step command does.`,
    '',
    '## Retention',
    '',
    'DeleteAccount, DeleteWorkspace and ArchiveTemplate are soft deletes. Only the system actor purges, as a 12.1 slice B job with a receipt event.',
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
        [row.status === 'planned' ? `Planned, ${leaf(row.addedBy ?? '01.1')}.` : '', row.note ?? ''].filter(Boolean).join(' '),
      ]),
    ),
    '',
    'Every baseline relation, plus `instances.workspace` and the planned relations. Eight baseline relations keep cascade.',
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
  return lines.join('\n');
}
