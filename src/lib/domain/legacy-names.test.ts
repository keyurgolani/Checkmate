/**
 * CHECKMATE-01.1 · adapter (#29), test plan item 8 and #3 test 4: the
 * legacy-name ratchet. It scans every non-test file under src/ and holds each
 * file to its count in legacy-name-baseline.ts. legacy-name-scan.test.ts shows
 * what the scan counts.
 */
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
import { beforeAll, describe, expect, it } from 'vitest';
import { REPO_ROOT, compareToBaseline, countByFile, declaresExport, scanLegacyNames, sourceFiles, type LegacyNameScan } from '@/test/legacy-name-scan';
import { leafIssue } from './contract';
import { LEGACY_NAME_BASELINE } from './legacy-name-baseline';
import { ALLOWLIST, LEGACY_ALIAS_MODULE, LEGACY_ALIASES, PERMANENT_ENTRIES } from './legacy-names';
import { LEGACY_FIELD_NAMES, LEGACY_STORAGE_NAMES } from './storage';

const FIX = 'Name collections through Collections and fields and values through src/lib/domain/storage.ts and records.ts.';

describe('legacy-name ratchet', () => {
  let scan: LegacyNameScan;

  beforeAll(() => {
    scan = scanLegacyNames();
  }, 60_000);

  it('reads every non-test source file under src/ that no exemption covers', () => {
    const exempt = new Set(scan.exempt.map((entry) => entry.file));

    expect(scan.files.length).toBeGreaterThan(200);
    expect([...scan.files, ...exempt].sort()).toEqual(sourceFiles());
    expect(scan.files.some((file) => file.startsWith('src/lib/domain/'))).toBe(false);
  });

  it('adds no legacy storage name or alias import to any file', () => {
    const { grown } = compareToBaseline(countByFile(scan.hits), LEGACY_NAME_BASELINE);
    const files = new Set(grown.map((line) => line.slice(0, line.indexOf(': '))));
    const sites = scan.hits.filter((hit) => files.has(hit.file)).map((hit) => `${hit.file}:${hit.line} ${hit.form} ${hit.name}`);

    expect(grown, `${FIX}\n${sites.join('\n')}`).toEqual([]);
  });

  it('matches the baseline exactly, so a removed use lowers it', () => {
    expect(countByFile(scan.hits), 'Lower or drop the entry in src/lib/domain/legacy-name-baseline.ts').toEqual(LEGACY_NAME_BASELINE);
  });
});

describe('what the ratchet counts', () => {
  it('takes its storage names from the adapter', () => {
    expect(LEGACY_STORAGE_NAMES).toEqual([
      'blueprint',
      'blueprint_updated',
      'blueprints',
      'instance',
      'instanceItem',
      'instanceItems',
      'instance_reminder',
      'instances',
      'item',
      'items',
      'sourceItem',
    ]);
    expect(LEGACY_FIELD_NAMES).toEqual(['blueprint', 'instance', 'sourceItem']);
  });

  it('lists the 19 deprecated aliases, each still exported by pocketbase-types.ts', () => {
    const file = `${LEGACY_ALIAS_MODULE}.ts`;
    const source = ts.createSourceFile(file, readFileSync(path.join(REPO_ROOT, file), 'utf8'), ts.ScriptTarget.Latest, true);
    const exported = (name: string): boolean =>
      declaresExport(source, name) ||
      source.statements.some((statement) => ts.isTypeAliasDeclaration(statement) && statement.name.text === name && statement.modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword));

    expect(LEGACY_ALIASES).toHaveLength(19);
    expect(new Set(LEGACY_ALIASES).size).toBe(19);
    expect(LEGACY_ALIASES.filter((alias) => !exported(alias))).toEqual([]);
  });

  it('gives each exemption an owning leaf and a reason, and names files that exist', () => {
    const exemptions = [...ALLOWLIST, ...PERMANENT_ENTRIES];
    const malformed = exemptions.filter(
      (exemption) =>
        !exemption.path.startsWith('src/') ||
        exemption.reason.length < 20 ||
        /[\u2013\u2014]/.test(exemption.reason) ||
        (exemption.exporting !== undefined && !exemption.path.endsWith('/')),
    );

    expect(malformed).toEqual([]);
    for (const exemption of exemptions) expect(() => leafIssue(exemption.owner), exemption.path).not.toThrow();
    // A file entry goes when its file goes; folder entries may wait for the leaf that adds them.
    expect(exemptions.filter((exemption) => !exemption.path.endsWith('/') && !existsSync(path.join(REPO_ROOT, exemption.path)))).toEqual([]);
  });

  it('keeps the v1 export reader and the 16.3 file form as permanent entries', () => {
    expect(PERMANENT_ENTRIES.map((entry) => [entry.path, entry.exporting ?? null, `#${leafIssue(entry.owner)}`])).toEqual([
      ['src/lib/services/export/import-parsers.ts', null, '#75'],
      ['src/lib/portable/', 'readLegacyExport', '#74'],
      ['src/lib/portable/blueprint/', null, '#76'],
    ]);
    expect(ALLOWLIST.map((entry) => entry.path)).toEqual(['src/lib/domain/']);
  });
});
