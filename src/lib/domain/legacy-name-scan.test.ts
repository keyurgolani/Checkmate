/**
 * CHECKMATE-01.1 · adapter (#29), test plan items 1 and 8: the ratchet's
 * self-test. Each case scans made-up files, so it shows what the scanner
 * counts and leaves alone without touching the tree. legacy-names.test.ts
 * runs the real scan against the baseline.
 */
import { describe, expect, it } from 'vitest';
import { compareToBaseline, countByFile, queryNames, scanLegacyNames } from '@/test/legacy-name-scan';
import { LEGACY_NAME_BASELINE } from './legacy-name-baseline';

/** `line form name` for each hit in one made-up file. */
function hitsIn(file: string, text: string): string[] {
  return scanLegacyNames({ sources: { [file]: text } }).hits.map((hit) => `${hit.line} ${hit.form} ${hit.name}`);
}

const SERVICE = 'src/lib/services/new-service.ts';

describe('legacy-name scan', () => {
  it('counts a legacy storage name as a whole string literal, in any position', () => {
    const text = [
      "pb.collection('blueprints');",
      'pb.collection("instanceItems");',
      'pb.collection(`items`);',
      "type Stored = 'instances';",
      "const notice = { type: 'instance_reminder', resourceType: 'instanceItem', other: 'blueprint_updated' };",
      "read(row['sourceItem']);",
      "const props = <Field name=\"blueprint\" />;",
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
    ].join('\n');

    expect(hitsIn(SERVICE, text)).toEqual([]);
  });

  it('counts a legacy relation field read as a property', () => {
    const text = [
      'read(step.blueprint);',
      'read(event.record?.instance);',
      'read(task.sourceItem);',
      'read(run.expand?.blueprint?.title);',
    ].join('\n');

    expect(hitsIn(SERVICE, text)).toEqual(['1 access blueprint', '2 access instance', '3 access sourceItem', '4 access blueprint']);
  });

  it('counts legacy names in filter, expand and sort strings', () => {
    const text = [
      'list({ filter: `blueprint = "${id}" && parent = null` });',
      "list({ filter: 'instance.user = {:user} && isCompleted = true' });",
      "list({ filter: `resourceType = \"instanceItem\" || type = 'blueprint_updated'` });",
      "list({ filter: '@collection.instances.user ?= @request.auth.id' });",
      "list({ expand: 'blueprint,blueprint.owner' });",
      "list({ sort: '-sourceItem' });",
      'list({ filter: `title ~ "blueprint guide"` });',
      "list({ fields: 'id,title,instanceCount' });",
      'const filters = ids.map((id) => `blueprint = "${id}"`).join(" || ");',
    ].join('\n');

    expect(hitsIn(SERVICE, text)).toEqual([
      '1 query blueprint',
      '2 query instance',
      '3 query instanceItem',
      '3 query blueprint_updated',
      '4 query instances',
      '5 query blueprint',
      '5 query blueprint',
      '6 query sourceItem',
      '9 query blueprint',
    ]);
  });

  it('reads a query string field by field', () => {
    expect(queryNames('blueprint.workspace.owner ?= @request.auth.id && instance != ""')).toEqual(['blueprint', 'instance']);
    expect(queryNames('expand.blueprint.title')).toEqual(['blueprint']);
    expect(queryNames('status = "instance"')).toEqual(['instance']);
    expect(queryNames('title = "Instance"')).toEqual([]);
    expect(queryNames('owner,workspace')).toEqual([]);
    expect(queryNames('blueprint')).toEqual([]);
  });

  it('counts each deprecated alias imported from pocketbase-types.ts, however it is imported', () => {
    const text = [
      "import type { Blueprint, Template } from '../pocketbase-types';",
      "import { isTask as isRunStep, Collections } from '@/lib/pocketbase-types';",
      "export { InstanceItem } from '../pocketbase-types';",
      "type Created = import('@/lib/pocketbase-types').InstanceCreate;",
      "import * as PB from '../pocketbase-types';",
      'type Step = PB.Task;',
      'const name = PB.BLUEPRINTS_COLLECTION;',
      "import { Task } from './task-list';",
      "import type { Instance } from 'some-package';",
    ].join('\n');

    expect(hitsIn(SERVICE, text)).toEqual([
      '1 alias Blueprint',
      '2 alias isTask',
      '3 alias InstanceItem',
      '4 alias InstanceCreate',
      '6 alias Task',
      '7 alias BLUEPRINTS_COLLECTION',
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
      'src/lib/services/collaboration.ts: 14 lowered to 13',
      'src/lib/services/search.ts: 1 lowered to 0',
    ]);
  });

  it('fails on a new file with a legacy literal', () => {
    const file = 'src/lib/services/run-creation.ts';
    const found = { ...LEGACY_NAME_BASELINE, ...countByFile(scanLegacyNames({ sources: { [file]: "pb.collection('instances');" } }).hits) };

    expect(compareToBaseline(found, LEGACY_NAME_BASELINE).grown).toEqual([`${file}: 1, not in the baseline`]);
  });

  it('fails on a new alias import in a file the baseline lists', () => {
    const file = 'src/lib/services/search.ts';
    const added = countByFile(scanLegacyNames({ sources: { [file]: "import type { InstanceItem } from '../pocketbase-types';" } }).hits);
    const found = { ...LEGACY_NAME_BASELINE, [file]: (LEGACY_NAME_BASELINE[file] ?? 0) + (added[file] ?? 0) };

    expect(compareToBaseline(found, LEGACY_NAME_BASELINE).grown).toEqual([`${file}: 1 raised to 2`]);
  });
});
