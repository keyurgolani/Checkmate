/**
 * CHECKMATE-01.1 · adapter (#29), test plan items 1 and 8: the ratchet's
 * self-test. Each case scans made-up files, so it shows what the scanner
 * counts and leaves alone without touching the tree. legacy-names.test.ts
 * runs the real scan against the baseline.
 */
import { describe, expect, it } from 'vitest';
import { compareToBaseline, countByFile, queryNames, scanLegacyNames, urlNames } from '@/test/legacy-name-scan';
import { LEGACY_NAME_BASELINE } from './legacy-name-baseline';

/** `line form name` for each hit in one made-up file. */
function hitsIn(file: string, text: string): string[] {
  return scanLegacyNames({ sources: { [file]: text } }).hits.map((hit) => `${hit.line} ${hit.form} ${hit.name}`);
}

const SERVICE = 'src/lib/services/new-service.ts';

describe('storage names in strings', () => {
  it('counts a legacy storage name as a whole string literal, in any position', () => {
    const text = [
      "pb.collection('blueprints');",
      'pb.collection("instanceItems");',
      'pb.collection(`items`);',
      "type Stored = 'instances';",
      "const notice = { type: 'instance_reminder', resourceType: 'instanceItem', other: 'blueprint_updated' };",
      "read(row['sourceItem']);",
      'const props = <Field name="blueprint" />;',
    ].join('\n');

    expect(hitsIn('src/components/new.tsx', text)).toEqual([
      '1 literal blueprints',
      '2 literal instanceItems',
      '3 literal items',
      '4 literal instances',
      '5 literal instance_reminder',
      '5 literal instanceItem',
      '5 literal blueprint_updated',
      '6 literal sourceItem',
      '7 literal blueprint',
    ]);
  });

  it('counts a whole template chunk and a collection URL', () => {
    const text = [
      'pb.collection(`${prefix}blueprints`);',
      'fetch(`${base}/api/collections/instances/records?page=${page}`);',
      "fetch('/api/collections/items/records');",
      'fetch(`/api/collections/${name}/records`);',
      'const label = `${count} items`;',
    ].join('\n');

    expect(hitsIn(SERVICE, text)).toEqual(['1 literal blueprints', '2 url instances', '3 url items']);
  });

  it('ignores comments, prose, look-alikes and canonical names', () => {
    const text = [
      "// pb.collection('blueprints') and blueprint = \"x\"",
      "/** expand: 'blueprint,blueprint.owner' */",
      "const a = 'Blueprints';",
      "const b = 'Pick a blueprint';",
      "const c = 'blueprintId';",
      'const d = record.blueprintId + list.items.length;',
      "const e = 'templates';",
      "const f = 'For instance, a = b';",
      "const g = 'template_updated';",
      "const h = 'run_reminder';",
      '/* sourceItem */ const i = 1;',
      "const j = 'a blueprint = template';",
      "const k = 'data-[state=open]:bg-accent';",
      'function format(blueprint: string, instance: number) { return blueprint + instance; }',
    ].join('\n');

    expect(hitsIn(SERVICE, text)).toEqual([]);
  });
});

describe('relation fields in code', () => {
  it('counts a field read as a property', () => {
    const text = [
      'read(step.blueprint);',
      'read(event.record?.instance);',
      'read(task.sourceItem);',
      'read(run.expand?.blueprint?.title);',
    ].join('\n');

    expect(hitsIn(SERVICE, text)).toEqual(['1 access blueprint', '2 access instance', '3 access sourceItem', '4 access blueprint']);
  });

  it('counts object keys, shorthand, destructured names and type members', () => {
    const text = [
      'pb.collection(Collections.RUNS).create({ blueprint: templateId, user });',
      'const step = { instance, sourceItem: null };',
      'const { blueprint, instance: runId } = row;',
      'function read({ sourceItem }: Row) { return sourceItem; }',
      'interface Row { blueprint: string; instance?: string; expand?: { sourceItem?: Item } }',
      'type Create = { readonly blueprint: string };',
      "const quoted = { 'blueprint': id };",
      'class Cache { private static instance: Cache; }',
    ].join('\n');

    expect(hitsIn(SERVICE, text)).toEqual([
      '1 key blueprint',
      '2 key instance',
      '2 key sourceItem',
      '3 key blueprint',
      '3 key instance',
      '4 key sourceItem',
      '5 member blueprint',
      '5 member instance',
      '5 member sourceItem',
      '6 member blueprint',
      '7 literal blueprint',
    ]);
  });
});

describe('query strings', () => {
  it('counts legacy names on both sides of filter comparisons', () => {
    const text = [
      'list({ filter: `blueprint = "${id}" && parent = null` });',
      "list({ filter: 'instance.user = {:user} && isCompleted = true' });",
      "list({ filter: `resourceType = \"instanceItem\" || type = 'blueprint_updated'` });",
      "list({ filter: '@collection.instances.user ?= @request.auth.id' });",
      "list({ filter: 'id = @request.body.blueprint' });",
      "list({ filter: 'instanceItems_via_instance.isCompleted ?= true' });",
      "list({ filter: 'sourceItem:isset = true && blueprint.items:length > 0' });",
      "list({ filter: `strftime('%Y', instance.created) = \"2026\"` });",
      'list({ filter: `title ~ "blueprint guide"` });',
      'const filters = ids.map((id) => `blueprint = "${id}"`).join(" || ");',
      'filter += ` && instance = "${id}"`;',
    ].join('\n');

    expect(hitsIn(SERVICE, text)).toEqual([
      '1 query blueprint',
      '2 query instance',
      '3 query instanceItem',
      '3 query blueprint_updated',
      '4 query instances',
      '5 query blueprint',
      '6 query instanceItems',
      '6 query instance',
      '7 query sourceItem',
      '7 query blueprint',
      '8 query instance',
      '10 query blueprint',
      '11 query instance',
    ]);
  });

  it('counts legacy names in expand, sort and fields lists', () => {
    const text = [
      "list({ expand: 'blueprint,blueprint.owner' });",
      "list({ sort: '-sourceItem' });",
      "list({ expand: 'instanceItems_via_instance' });",
      "list({ fields: 'id,title,instanceCount,description:excerpt(200,true)' });",
    ].join('\n');

    expect(hitsIn(SERVICE, text)).toEqual(['1 query blueprint', '1 query blueprint', '2 query sourceItem', '3 query instanceItems', '3 query instance']);
  });

  it('reads a query string field by field', () => {
    expect(queryNames('blueprint.workspace.owner ?= @request.auth.id && instance != ""')).toEqual(['blueprint', 'instance']);
    expect(queryNames('expand.blueprint.title')).toEqual(['blueprint']);
    expect(queryNames('status = "instance"')).toEqual(['instance']);
    expect(queryNames('owner = blueprint')).toEqual(['blueprint']);
    expect(queryNames('(a = 1 || instance = 2) && b = 3')).toEqual(['instance']);
    expect(queryNames('title = "Instance"')).toEqual([]);
    expect(queryNames('owner,workspace')).toEqual([]);
    expect(queryNames('blueprint')).toEqual([]);
    expect(queryNames('blueprint instance')).toEqual([]);
    expect(urlNames('/api/collections/blueprints/records/abc')).toEqual(['blueprints']);
    expect(urlNames('/api/collections/templates/records')).toEqual([]);
  });
});

describe('deprecated aliases', () => {
  it('counts each one imported from pocketbase-types.ts, however it is imported', () => {
    const text = [
      "import type { Blueprint, Template } from '../pocketbase-types';",
      "import { isTask as isRunStep, Collections } from '@/lib/pocketbase-types';",
      "type Created = import('@/lib/pocketbase-types').InstanceCreate;",
      "import * as PB from '../pocketbase-types';",
      'type Step = PB.Task;',
      'const name = PB.BLUEPRINTS_COLLECTION;',
      "const guard = PB['isBlueprint'];",
      "import Types = require('../pocketbase-types');",
      'type Run = Types.Instance;',
      "const { isInstance } = await import('@/lib/pocketbase-types');",
      "const loaded = await import('@/lib/pocketbase-types');",
      'read(loaded.isInstanceItem);',
      "read((await import('../pocketbase-types')).InstanceItemCreate);",
      "const { TaskUpdate } = require('../pocketbase-types');",
      "import { Task } from './task-list';",
      "import type { Instance } from 'some-package';",
    ].join('\n');

    expect(hitsIn(SERVICE, text)).toEqual([
      '1 alias Blueprint',
      '2 alias isTask',
      '3 alias InstanceCreate',
      '5 alias Task',
      '6 alias BLUEPRINTS_COLLECTION',
      '7 alias isBlueprint',
      '9 alias Instance',
      '10 alias isInstance',
      '12 alias isInstanceItem',
      '13 alias InstanceItemCreate',
      '14 alias TaskUpdate',
    ]);
  });

  it('counts each re-export of one at the re-exporting site', () => {
    const text = [
      "import type { Blueprint } from '../pocketbase-types';",
      "import { isTask } from '../pocketbase-types';",
      "export { InstanceItem } from '../pocketbase-types';",
      "export * from '@/lib/pocketbase-types';",
      "export * as Types from '../pocketbase-types';",
      'export { Blueprint as Template };',
      'export type MaybeBlueprint = Blueprint | null;',
      'export type Wrapped = Result<Blueprint, Error>;',
      'export const isStep = isTask;',
      'export default isTask;',
      "export * from '../domain/storage';",
    ].join('\n');

    expect(hitsIn(SERVICE, text)).toEqual([
      '1 alias Blueprint',
      '2 alias isTask',
      '3 alias InstanceItem',
      '4 alias *',
      '5 alias *',
      '6 alias Blueprint',
      '7 alias MaybeBlueprint',
      '9 alias isTask',
      '10 alias isTask',
    ]);
  });

  it('counts an alias name imported from a domain module, and reads .d.ts files', () => {
    const scan = scanLegacyNames({
      sources: {
        [SERVICE]: "import type { Blueprint } from '@/lib/domain/legacy-types';",
        'src/types/pocketbase.d.ts': "export { Instance, Template } from '../lib/pocketbase-types';",
      },
    });

    expect(scan.hits.map((hit) => `${hit.file} ${hit.form} ${hit.name}`)).toEqual([
      `${SERVICE} alias Blueprint`,
      'src/types/pocketbase.d.ts alias Instance',
    ]);
  });

  it('never reads a module path as a storage name', () => {
    const text = [
      "import { items } from './items';",
      "export * from './instances';",
      "const lazy = await import('./blueprints');",
      "type Loaded = typeof import('./instance');",
    ].join('\n');

    expect(hitsIn(SERVICE, text)).toEqual([]);
  });
});

describe('members named for a retired word', () => {
  it('counts each use, however its holder is imported', () => {
    const text = [
      "import { Collections as C, NotificationType } from '@/lib/pocketbase-types';",
      "import * as PB from '../pocketbase-types';",
      'pb.collection(Collections.ITEMS);',
      "pb.collection(C['CHECKLISTS']);",
      'const { CHECKLIST_ITEMS, RUNS } = C;',
      'if (type === NotificationType.BLUEPRINT_UPDATED) read(NotificationType.SYSTEM);',
      'const filter = `resourceType = "${ResourceType.ITEM}"`;',
      'type Stored = typeof Collections.CHECKLISTS;',
      'read(PB.Collections.ITEMS, PB.NotificationType.INSTANCE_REMINDER);',
      'pb.collection(Collections.RUNS);',
    ].join('\n');

    expect(hitsIn(SERVICE, text)).toEqual([
      '3 deprecated ITEMS',
      '4 deprecated CHECKLISTS',
      '5 deprecated CHECKLIST_ITEMS',
      '6 deprecated BLUEPRINT_UPDATED',
      '7 deprecated ITEM',
      '8 deprecated CHECKLISTS',
      '9 deprecated ITEMS',
      '9 deprecated INSTANCE_REMINDER',
    ]);
  });
});

describe('exemptions', () => {
  it('skips test files, the domain folder and the permanent entries, and counts the rest', () => {
    const legacy = "export const name = 'blueprints';\nread(row.blueprint);";
    const scan = scanLegacyNames({
      sources: {
        'src/lib/domain/new-contract.ts': legacy,
        'src/lib/services/new.test.ts': legacy,
        'src/test/new-helper.ts': legacy,
        'src/lib/domain/new.typetest.ts': legacy,
        'src/lib/services/export/import-parsers.ts': 'const template = obj.template || obj.blueprint;',
        'src/lib/portable/legacy-export.ts': 'export function readLegacyExport(obj: { blueprint: string }) { return obj.blueprint; }',
        'src/lib/portable/envelope.ts': "export const KIND = 'blueprint';",
        'src/lib/portable/barrel.ts': "export { readLegacyExport } from './legacy-export';\nexport const KIND = 'blueprint';",
      },
    });

    expect(scan.exempt.map(({ file, by }) => `${file} ${by.owner}`)).toEqual([
      'src/lib/domain/new-contract.ts 01.1',
      'src/lib/services/export/import-parsers.ts 16.2',
      'src/lib/portable/legacy-export.ts 16.1',
    ]);
    expect(countByFile(scan.hits)).toEqual({ 'src/lib/portable/envelope.ts': 1, 'src/lib/portable/barrel.ts': 1 });
    expect(scan.claims).toEqual({ readLegacyExport: ['src/lib/portable/legacy-export.ts'] });
  });

  it('exempts only a sole module that declares `export function readLegacyExport`', () => {
    const reader = 'export function readLegacyExport(obj: { blueprint: string }) { return obj.blueprint; }';
    const twoClaims = scanLegacyNames({
      sources: { 'src/lib/portable/v1.ts': reader, 'src/lib/portable/v1-copy.ts': reader },
    });
    const notAFunction = scanLegacyNames({
      sources: { 'src/lib/portable/v1.ts': 'export const readLegacyExport = (obj: { blueprint: string }) => obj.blueprint;' },
    });
    const outsidePortable = scanLegacyNames({ sources: { 'src/lib/services/v1.ts': reader } });

    expect(twoClaims.exempt).toEqual([]);
    expect(twoClaims.claims).toEqual({ readLegacyExport: ['src/lib/portable/v1.ts', 'src/lib/portable/v1-copy.ts'] });
    expect(countByFile(twoClaims.hits)).toEqual({ 'src/lib/portable/v1.ts': 2, 'src/lib/portable/v1-copy.ts': 2 });
    expect(notAFunction.exempt).toEqual([]);
    expect(countByFile(notAFunction.hits)).toEqual({ 'src/lib/portable/v1.ts': 2 });
    expect(outsidePortable.exempt).toEqual([]);
  });

  it("passes the file form's 'blueprint' literal in 16.3's src/lib/portable/blueprint/ module", () => {
    const fileForm = "export const FILE_FORM = 'blueprint';\nexport const CAUSATION = { kind: 'blueprint' } as const;";
    const scan = scanLegacyNames({
      sources: { 'src/lib/portable/blueprint/format.ts': fileForm, 'src/lib/services/new-export.ts': fileForm },
    });

    expect(scan.exempt.map(({ file, by }) => `${file} ${by.owner}`)).toEqual(['src/lib/portable/blueprint/format.ts 16.3']);
    expect(countByFile(scan.hits)).toEqual({ 'src/lib/services/new-export.ts': 2 });
  });
});

describe('ratchet comparison', () => {
  it('passes the baseline itself and any lowered count', () => {
    const lowered: Record<string, number> = { ...LEGACY_NAME_BASELINE, 'src/lib/services/collaboration.ts': 13 };
    delete lowered['src/lib/services/search.ts'];

    expect(compareToBaseline(LEGACY_NAME_BASELINE, LEGACY_NAME_BASELINE)).toEqual({ grown: [], shrunk: [] });
    expect(compareToBaseline(lowered, LEGACY_NAME_BASELINE).grown).toEqual([]);
    expect(compareToBaseline(lowered, LEGACY_NAME_BASELINE).shrunk).toEqual([
      `src/lib/services/collaboration.ts: ${LEGACY_NAME_BASELINE['src/lib/services/collaboration.ts']} lowered to 13`,
      `src/lib/services/search.ts: ${LEGACY_NAME_BASELINE['src/lib/services/search.ts']} lowered to 0`,
    ]);
  });

  it('fails on a new file with a legacy literal', () => {
    const file = 'src/lib/services/run-creation.ts';
    const found = { ...LEGACY_NAME_BASELINE, ...countByFile(scanLegacyNames({ sources: { [file]: "pb.collection('instances');" } }).hits) };

    expect(compareToBaseline(found, LEGACY_NAME_BASELINE).grown).toEqual([`${file}: 1, not in the baseline`]);
  });

  it('fails on a new alias import in a file the baseline lists', () => {
    const file = 'src/lib/services/search.ts';
    const before = LEGACY_NAME_BASELINE[file] ?? 0;
    const added = countByFile(scanLegacyNames({ sources: { [file]: "import type { InstanceItem } from '../pocketbase-types';" } }).hits);
    const found = { ...LEGACY_NAME_BASELINE, [file]: before + (added[file] ?? 0) };

    expect(compareToBaseline(found, LEGACY_NAME_BASELINE).grown).toEqual([`${file}: ${before} raised to ${before + 1}`]);
  });
});
