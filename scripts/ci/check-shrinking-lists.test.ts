import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { describe, expect, it } from 'vitest';
import { SCRIPT, SHRINKING_LISTS, checkLists, growth, listedIn, parseCounts, parseRenames } from './check-shrinking-lists.mjs';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

const LIST = 'src/lib/domain/legacy-name-baseline.ts';

function list(entries: string): string {
  return `export const LIST: Readonly<Record<string, number>> = {\n${entries}\n};\n`;
}

describe('parseCounts', () => {
  it('reads one count per entry, however the entries are laid out', () => {
    const text = [
      '/** A comment. */',
      'export const LIST: Readonly<Record<string, number>> = {',
      "  'src/app/a/route.ts': 4, // a trailing comment",
      '  "src/app/(group)/[id]/actions.ts": 16, \'src/b.ts\': 2',
      '} as const;',
    ].join('\n');

    expect(parseCounts(text)).toEqual({ 'src/app/a/route.ts': 4, 'src/app/(group)/[id]/actions.ts': 16, 'src/b.ts': 2 });
  });

  it.each([
    ['a spread', list("  ...OTHER,\n  'src/a.ts': 1")],
    ['a computed key', list("  [KEY]: 1")],
    ['an unquoted key', list('  path: 1')],
    ['a count that is not a whole number', list("  'src/a.ts': 1.5")],
    ['a count that is an expression', list("  'src/a.ts': 1 + 1")],
    ['a hex count', list("  'src/a.ts': 0x10")],
    ['a key listed twice', list("  'src/a.ts': 1,\n  'src/a.ts': 9")],
    ['a second export', `${list("  'src/a.ts': 1")}export const MORE = {};\n`],
    ['no export', "const LIST = { 'src/a.ts': 1 };\n"],
  ])('rejects %s', (_case, text) => {
    expect(() => parseCounts(text, 'list.ts')).toThrow(/list\.ts/);
  });

  it('reads every listed file exactly as its module exports it', async () => {
    for (const file of SHRINKING_LISTS) {
      const absolute = path.join(REPO_ROOT, file);
      expect(existsSync(absolute), file).toBe(true);
      const loaded = (await import(pathToFileURL(absolute).href)) as Record<string, unknown>;
      const exported = Object.values(loaded);
      expect(exported, file).toHaveLength(1);
      expect(parseCounts(readFileSync(absolute, 'utf8'), file), file).toEqual(exported[0]);
      expect(Object.keys(exported[0] as object).length, file).toBeGreaterThan(0);
    }
  });
});

describe('growth', () => {
  it('allows lowering and dropping entries', () => {
    expect(growth({ a: 4, b: 2 }, { a: 3 })).toEqual([]);
    expect(growth({ a: 4 }, { a: 4 })).toEqual([]);
  });

  it('fails a raised count or an added entry', () => {
    expect(growth({ a: 4 }, { a: 5, b: 1 })).toEqual(['a: 4 raised to 5', 'b: added with 1']);
  });

  it('carries a count across a rename git detects', () => {
    const renames = new Map([['src/app/runs/page.tsx', 'src/app/checklists/page.tsx']]);

    expect(growth({ 'src/app/checklists/page.tsx': 5 }, { 'src/app/runs/page.tsx': 5 }, renames)).toEqual([]);
    expect(growth({ 'src/app/checklists/page.tsx': 5 }, { 'src/app/runs/page.tsx': 3 }, renames)).toEqual([]);
    expect(growth({ 'src/app/checklists/page.tsx': 5 }, { 'src/app/runs/page.tsx': 6 }, renames)).toEqual([
      'src/app/runs/page.tsx: 5 raised to 6 (moved from src/app/checklists/page.tsx)',
    ]);
    expect(growth({ 'src/app/checklists/page.tsx': 5 }, { 'src/app/runs/page.tsx': 5 })).toEqual(['src/app/runs/page.tsx: added with 5']);
  });
});

describe('parseRenames', () => {
  it('maps each renamed path to its old path from `git diff --name-status -M -z` output', () => {
    const output = ['M', 'src/a.ts', 'R087', 'src/app/(dashboard)/checklists/page.tsx', 'src/app/(dashboard)/runs/page.tsx', 'A', 'src/b.ts', 'C075', 'src/c.ts', 'src/d.ts', ''].join('\0');

    expect([...parseRenames(output)]).toEqual([['src/app/(dashboard)/runs/page.tsx', 'src/app/(dashboard)/checklists/page.tsx']]);
  });
});

describe('listedIn', () => {
  it("reads this script's own SHRINKING_LISTS", () => {
    expect(listedIn(readFileSync(path.join(REPO_ROOT, SCRIPT), 'utf8'))).toEqual(SHRINKING_LISTS);
    expect(listedIn(undefined)).toEqual([]);
  });
});

describe('checkLists', () => {
  const base = list("  'src/a.ts': 4,\n  'src/b.ts': 2");
  const files = (entries: Record<string, string>) => (file: string) => entries[file];

  it('passes a list that shrinks or holds, and a new list', () => {
    expect(
      checkLists({
        baseLists: [LIST],
        headLists: [LIST, 'src/lib/new-list.ts'],
        atBase: files({ [LIST]: base }),
        atHead: files({ [LIST]: list("  'src/a.ts': 3"), 'src/lib/new-list.ts': list("  'src/x.ts': 1") }),
        renames: new Map(),
      }),
    ).toEqual([]);
  });

  it('fails a list renamed while a count rises, and passes the same rename with the counts held', () => {
    const renamed = 'src/lib/domain/legacy-names-baseline.ts';
    const input = (head: string) => ({
      baseLists: [LIST],
      headLists: [renamed],
      atBase: files({ [LIST]: base }),
      atHead: files({ [renamed]: head }),
      renames: new Map([[renamed, LIST]]),
    });

    expect(checkLists(input(list("  'src/a.ts': 5,\n  'src/b.ts': 2")))).toEqual([`${renamed} may only shrink:\n  src/a.ts: 4 raised to 5`]);
    expect(checkLists(input(base))).toEqual([]);
  });

  it('fails a list with entries that is deleted, or dropped from SHRINKING_LISTS', () => {
    const deleted = checkLists({ baseLists: [LIST], headLists: [], atBase: files({ [LIST]: base }), atHead: files({}), renames: new Map() });
    const unlisted = checkLists({ baseLists: [LIST], headLists: [], atBase: files({ [LIST]: base }), atHead: files({ [LIST]: base }), renames: new Map() });
    const emptied = checkLists({
      baseLists: [LIST],
      headLists: [],
      atBase: files({ [LIST]: list('') }),
      atHead: files({}),
      renames: new Map(),
    });

    expect(deleted).toEqual([`${LIST}: a shrinking list with entries must stay, and stay in SHRINKING_LISTS, until it is empty`]);
    expect(unlisted).toEqual(deleted);
    expect(emptied).toEqual([]);
  });

  it('fails a malformed list, and a listed file that is missing', () => {
    const problems = checkLists({
      baseLists: [],
      headLists: [LIST, 'src/lib/gone.ts'],
      atBase: files({}),
      atHead: files({ [LIST]: list("  ...OTHER,\n  'src/a.ts': 1") }),
      renames: new Map(),
    });

    expect(problems).toHaveLength(2);
    expect(problems[0]).toMatch(/no spread, shorthand or computed key/);
    expect(problems[1]).toBe('src/lib/gone.ts: listed in SHRINKING_LISTS but missing');
  });

  it('carries entry counts across renames in the same change', () => {
    expect(
      checkLists({
        baseLists: [LIST],
        headLists: [LIST],
        atBase: files({ [LIST]: list("  'src/app/checklists/page.tsx': 5") }),
        atHead: files({ [LIST]: list("  'src/app/runs/page.tsx': 5") }),
        renames: new Map([['src/app/runs/page.tsx', 'src/app/checklists/page.tsx']]),
      }),
    ).toEqual([]);
  });
});
