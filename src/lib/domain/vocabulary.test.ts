/**
 * CHECKMATE-01.1 · contracts (#29), test plan item 2: every PRODUCT.md entity
 * and #29 supporting term has one label, domain name, storage name and owner,
 * and docs/architecture/glossary.md lists them and matches the data. PRODUCT.md
 * is not in this repository, so its entity list is checked in below (#3 test
 * 1). Also checks the decision records, the owners against the dependency
 * graph, and the navigation map against today's pages.
 */
import fs from 'fs';
import path from 'path';
import { describe, expect, it } from 'vitest';
import { DECISION_RECORDS, DOMAIN_CONTRACT_VERSION, leafIssue, type LeafId } from './contract';
import { GLOSSARY_FILE, linkLeaves, renderGlossary } from './glossary-markdown';
import { AGGREGATES, COMMANDS, IMMUTABLE_RECORDS, MINIMUM_STATES, TRANSITION_TABLES } from './lifecycles';
import { COLLECTIONS, PURGES, RELATIONS } from './retention';
import {
  ACTION_LABELS,
  CAPABILITY_QUALIFIERS,
  DESTINATIONS,
  ENTITIES,
  KIND_KEYS,
  RETIRED_WORDS,
  ROUTE_MOVES,
  SUPPORTING_TERMS,
  TERMS,
  findTerm,
  movedPath,
} from './vocabulary';

const ROOT = path.resolve(__dirname, '../../..');
const read = (file: string) => fs.readFileSync(path.join(ROOT, file), 'utf8');

/** PRODUCT.md's governing product model, in its order, with the owners #29 names. */
const ENTITY_OWNERS: readonly (readonly [string, LeafId])[] = [
  ['Account', '02.1'],
  ['Secret Reference', '02.2'],
  ['Workspace', '03.1'],
  ['Template', '04.1'],
  ['Template Draft', '04.1'],
  ['Template Revision', '04.1'],
  ['Step Definition', '05.1'],
  ['Module Include', '06.1'],
  ['Run', '07.1'],
  ['Run Step', '07.1'],
  ['Participant', '03.2'],
  ['Assignment', '08.1'],
  ['Evidence', '10.1'],
  ['Comment', '10.1'],
  ['Approval Decision', '10.2'],
  ['Exception', '08.3'],
  ['Event', '12.1'],
  ['Audit Entry', '12.2'],
  ['Share Capability', '03.3'],
  ['Catalog Package', '13.1'],
  ['Schedule', '08.2'],
  ['Automation Definition', '15.3'],
  ['Completion Record', '10.3'],
];

/** #29's supporting terms with their owners, then the terms 01.1 defines. */
const SUPPORTING_OWNERS: readonly (readonly [string, LeafId])[] = [
  ['Membership', '03.1'],
  ['Grant', '03.1'],
  ['Invitation', '03.1'],
  ['Guest', '03.2'],
  ['Parameter', '06.2'],
  ['Role Slot', '06.2'],
  ['Condition', '08.3'],
  ['Module', '06.1'],
  ['Installation', '13.3'],
  ['Fork', '13.3'],
  ['Quarantine', '13.3'],
  ['Progress View', '03.3'],
  ['Report', '12.3'],
  ['Notification', '12.2'],
  ['Account Preferences', '17.1'],
  ['Principal', '01.2'],
  ['Step Key', '01.1'],
  ['Lineage', '01.1'],
  ['Aggregate revision', '01.1'],
  ['Step revision', '01.1'],
  ['Update Notice', '01.1'],
  ['Deferral', '01.1'],
  ['Projection', '01.1'],
];

describe('vocabulary', () => {
  it('lists the 23 PRODUCT.md entities in order, with the owners #29 names', () => {
    expect(ENTITIES.map((term) => [term.name, term.owner])).toEqual(ENTITY_OWNERS);
  });

  it('lists every supporting term #29 names, with its owner', () => {
    expect(SUPPORTING_TERMS.map((term) => [term.name, term.owner])).toEqual(SUPPORTING_OWNERS);
  });

  it.each(TERMS.map((term) => [term.name, term] as const))('gives %s one label, domain name, storage name and owner', (_name, term) => {
    if (term.label === null) expect(term.labelNote, 'a hidden label says why').toBeTruthy();
    else expect(term.label.trim()).toBe(term.label);
    expect(term.label).not.toBe('');
    expect(term.domainName).toMatch(/^[A-Za-z][A-Za-z0-9]*$/);
    if (term.storage.status === 'none') {
      expect(term.storage.name).toBeNull();
      expect(term.storage.note, 'an unstored term says how it is computed').toBeTruthy();
    } else {
      expect(term.storage.name).toMatch(/^[A-Za-z_][\w.]*( = \w+)?$/);
    }
    expect(() => leafIssue(term.owner)).not.toThrow();
    expect(term.meaning).toMatch(/^[A-Z].*\.$/);
  });

  it('uses each term name and domain name once', () => {
    expect(new Set(TERMS.map((term) => term.name)).size).toBe(TERMS.length);
    expect(new Set(TERMS.map((term) => term.domainName)).size).toBe(TERMS.length);
  });

  it('gives every label one meaning, except Step for Step Definition and Run Step', () => {
    const byLabel = new Map<string, string[]>();
    for (const term of TERMS) if (term.label !== null) byLabel.set(term.label, [...(byLabel.get(term.label) ?? []), term.name]);
    for (const [label, names] of byLabel) {
      expect(names, label).toEqual(label === 'Step' ? ['Step Definition', 'Run Step'] : [names[0]]);
    }
  });

  it('uses no retired word in a label', () => {
    for (const term of TERMS) {
      for (const { word } of RETIRED_WORDS) {
        expect(term.label ?? '', `${term.name} label`).not.toMatch(new RegExp(`\\b${word}\\b`, 'i'));
      }
    }
  });

  it('retires the words #29 and #1 retire', () => {
    const words = RETIRED_WORDS.map((retired) => retired.word);
    for (const word of ['Blueprint', 'Instance', 'InstanceItem', 'Checklist', 'Task', 'Item', 'Module Package', 'Phase']) {
      expect(words).toContain(word);
    }
    expect(RETIRED_WORDS.find((retired) => retired.word === 'Blueprint')?.note).toMatch(/file form/);
  });

  it('always qualifies "Capability"', () => {
    expect(CAPABILITY_QUALIFIERS.map((item) => [item.term, item.owner])).toEqual([
      ['Share Capability', '03.3'],
      ['Step capability', '05.1'],
      ['Provider capability', '14.1'],
      ['Package requirement capability', '13.1'],
    ]);
    const qualified = new Set(CAPABILITY_QUALIFIERS.map((item) => item.term.toLowerCase()));
    for (const term of TERMS) {
      if (/capability/i.test(term.name)) expect(qualified.has(term.name.toLowerCase()), term.name).toBe(true);
    }
  });

  it('lists the kind keys #29 names, with their owners', () => {
    expect(KIND_KEYS.map((kind) => [kind.key, kind.owner])).toEqual([
      ['task@1', '05.2'],
      ['instruction@1', '05.2'],
      ['section@1', '05.2'],
      ['legacy-reference@1', '05.2'],
      ['module-include@1', '06.1'],
      ['decision@1', '08.3'],
      ['field@1', '10.1'],
      ['evidence-request@1', '10.1'],
      ['approval@1', '10.2'],
      ['automation@1', '15.3'],
    ]);
    // 05.1's key pattern with an integer major.
    for (const kind of KIND_KEYS) expect(kind.key).toMatch(/^[a-z][a-z0-9-]{1,47}@[1-9][0-9]*$/);
  });

  it('finds terms by name, for the other contract files and the migration map', () => {
    expect(findTerm('Run')?.storage.name).toBe('instances');
    expect(findTerm('Checklist')).toBeUndefined();
  });
});

describe('owners', () => {
  interface GraphNode {
    id: string;
    type: string;
    issue: number;
  }
  const graph = JSON.parse(read('docs/transformation/dependency-graph.json')) as { nodes: GraphNode[] };
  const leaves = new Map(graph.nodes.filter((node) => node.type === 'leaf').map((node) => [node.id, node.issue]));

  const cited: LeafId[] = [
    ...TERMS.flatMap((term) => [term.owner, term.storage.addedBy, term.storage.movesTo?.by]),
    ...KIND_KEYS.map((kind) => kind.owner),
    ...CAPABILITY_QUALIFIERS.map((item) => item.owner),
    ...ROUTE_MOVES.map((move) => move.by),
    ...ACTION_LABELS.map((action) => action.owner),
    ...Object.values(COMMANDS).map((info) => info.owner),
    ...TRANSITION_TABLES.map((lifecycle) => lifecycle.owner),
    ...MINIMUM_STATES.map((row) => row.owner),
    ...IMMUTABLE_RECORDS.map((row) => row.owner),
    ...AGGREGATES.map((row) => row.owner),
    ...Object.values(PURGES).map((purge) => purge.owner),
    ...COLLECTIONS.map((row) => row.addedBy),
    ...RELATIONS.map((row) => row.executor),
  ].filter((leaf): leaf is LeafId => typeof leaf === 'string');

  it('cites only leaves in the dependency graph, with their issue numbers', () => {
    for (const leaf of new Set(cited)) {
      expect(leaves.get(`CHECKMATE-${leaf}`), leaf).toBe(leafIssue(leaf));
    }
  });

  it('maps every graph leaf to its issue', () => {
    expect(leaves.size).toBe(71);
    for (const [id, issue] of leaves) expect(leafIssue(id.replace('CHECKMATE-', '') as LeafId)).toBe(issue);
    expect(() => leafIssue('01.4')).toThrow(RangeError);
  });
});

describe('glossary.md', () => {
  const glossary = read(GLOSSARY_FILE);

  it('matches the contract files; run `npx tsx scripts/transformation/render.ts` after changing them', () => {
    expect(glossary).toBe(renderGlossary());
  });

  it('states the contract version', () => {
    expect(DOMAIN_CONTRACT_VERSION).toBe('1.0.0');
    expect(glossary).toContain('Domain contract `1.0.0`');
  });

  it.each(TERMS.map((term) => [term.name, term] as const))('has a row for %s with its label, domain name, storage and owner', (_name, term) => {
    const row = glossary.split('\n').find((line) => line.startsWith(`| ${term.name} | `));
    expect(row, term.name).toBeDefined();
    expect(row).toContain(term.label ?? 'Not shown');
    expect(row).toContain(`\`${term.domainName}\``);
    if (term.storage.name !== null) expect(row).toContain(`\`${term.storage.name}\``);
    const issue = leafIssue(term.owner);
    expect(row).toContain(`[#${issue}](https://github.com/keyurgolani/Checkmate/issues/${issue}) (CHECKMATE-${term.owner})`);
  });

  it('links leaf IDs outside code spans, and refuses an ID that is not a filed leaf', () => {
    expect(linkLeaves('Frozen by 03.1. Pinned to `03.1`.')).toBe(
      'Frozen by [#35](https://github.com/keyurgolani/Checkmate/issues/35) (CHECKMATE-03.1). Pinned to `03.1`.',
    );
    expect(linkLeaves('PocketBase 0.25.9, contract 1.0.0, CHECKMATE-04.1, 12.30 and #29')).toBe(
      'PocketBase 0.25.9, contract 1.0.0, CHECKMATE-04.1, 12.30 and #29',
    );
    expect(() => linkLeaves('Owned by 05.4.')).toThrow(RangeError);
  });
});

describe('decision records', () => {
  const DIRECTORY = 'docs/architecture/decisions';
  const files = fs.readdirSync(path.join(ROOT, DIRECTORY)).filter((file) => file.endsWith('.md'));

  it('has the records #29 lists, named by topic like the other leaves\' records', () => {
    expect(DECISION_RECORDS.map((record) => record.id)).toEqual([
      'run',
      'blueprint',
      'step-and-task',
      'section-and-reference',
      'step-key',
      'aggregates',
      'revision-store',
      'retention',
      'ia-map',
      'visibility',
      'personal-presentation',
    ]);
    for (const record of DECISION_RECORDS) expect(files, record.id).toContain(`${record.id}.md`);
    for (const file of files) expect(file, 'one naming convention').toMatch(/^[a-z][a-z0-9]*(-[a-z0-9]+)*\.md$/);
  });

  it.each(files)('%s has a status and superseded clauses', (file) => {
    const text = read(`${DIRECTORY}/${file}`);
    expect(text).toMatch(/^# .+\n/);
    expect(text).toMatch(/^- Status: (Accepted|Proposed|Superseded)$/m);
    expect(text).toMatch(/^- Supersedes: .+$/m);
    expect(text).toMatch(/^- Superseded by: .+$/m);
  });

  it.each(DECISION_RECORDS.map((record) => [record.id, record] as const))('%s has a title, status, contract and superseded clauses', (_id, record) => {
    const text = read(`${DIRECTORY}/${record.id}.md`);
    expect(text.startsWith(`# ${record.title}\n`)).toBe(true);
    expect(text).toMatch(/^- Status: (Accepted|Proposed|Superseded)$/m);
    expect(text).toMatch(/^- Contract: \d+\.\d+\.\d+$/m);
    expect(text).toMatch(/^- Supersedes: .+$/m);
    expect(text).toMatch(/^- Superseded by: .+$/m);
    for (const section of ['## Context', '## Decision', '## Consequences']) expect(text).toContain(`\n${section}\n`);
  });
});

describe('navigation', () => {
  it('lists the seven destinations in order', () => {
    expect(DESTINATIONS.map((destination) => [destination.id, destination.label, destination.route])).toEqual([
      ['today', 'Today', '/today'],
      ['library', 'Library', '/library'],
      ['runs', 'Runs', '/runs'],
      ['workspaces', 'Workspaces', '/workspaces'],
      ['catalog', 'Catalog', '/catalog'],
      ['activity', 'Activity', '/activity'],
      ['settings', 'Settings', '/settings'],
    ]);
  });

  it('moves the paths #29 lists, nested and print paths included', () => {
    expect(ROUTE_MOVES.map((move) => [move.from, move.to, move.by])).toEqual([
      ['/dashboard', '/today', '08.1'],
      ['/templates', '/library', '21.2'],
      ['/checklists', '/runs', '21.2'],
      ['/discover', '/catalog', '21.2'],
      ['/reports', '/activity/reports', '21.2'],
      ['/profile', '/settings/profile', '21.2'],
    ]);
    expect(movedPath('/templates/abc123/print')).toBe('/library/abc123/print');
    expect(movedPath('/reports/print')).toBe('/activity/reports/print');
    expect(movedPath('/checklists')).toBe('/runs');
    expect(movedPath('/templatesx')).toBeNull();
    expect(movedPath('/workspaces/abc123')).toBeNull();
  });

  it('puts every page and print page under a destination', () => {
    const pages: string[] = [];
    const walk = (directory: string) => {
      for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
        const full = path.join(directory, entry.name);
        if (entry.isDirectory()) walk(full);
        else if (entry.name === 'page.tsx') pages.push(full);
      }
    };
    for (const group of ['(dashboard)', '(print)']) walk(path.join(ROOT, 'src/app', group));
    expect(pages.length).toBeGreaterThan(0);
    for (const page of pages) {
      const url = `/${path
        .relative(path.join(ROOT, 'src/app'), path.dirname(page))
        .split(path.sep)
        .filter((segment) => !/^\(.*\)$/.test(segment))
        .join('/')}`;
      const target = movedPath(url) ?? url;
      const home = DESTINATIONS.find((destination) => target === destination.route || target.startsWith(`${destination.route}/`));
      expect(home, `${url} has no destination`).toBeDefined();
    }
  });

  it('labels the release and publish actions', () => {
    expect(ACTION_LABELS.map((action) => [action.label, action.command])).toEqual([
      ['Release revision N', 'PublishRevision'],
      ['Start run', 'CreateRun'],
      ['Release revision N and start', 'StartRunFromDraft'],
      ['Publish to catalog', 'PublishToCatalog'],
    ]);
  });
});
