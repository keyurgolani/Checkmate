/**
 * CHECKMATE-01.1 · adapter (#29), test plan item 8 and #3 test 4: the
 * legacy-name ratchet. It scans every non-test file under src/ and holds each
 * file to its count in legacy-name-baseline.ts. legacy-name-scan.test.ts shows
 * what the scan counts.
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
import { beforeAll, describe, expect, it } from 'vitest';
import * as pocketbaseTypes from '@/lib/pocketbase-types';
import { compareToBaseline, countByFile, resolveModule, scanLegacyNames, type LegacyNameScan } from '@/test/legacy-name-scan';
import { REPO_ROOT, isTestFile, sourceFiles } from '@/test/source-files';
import { leafIssue } from './contract';
import { LEGACY_NAME_BASELINE } from './legacy-name-baseline';
import { ALLOWLIST, LEGACY_ALIAS_MODULE, LEGACY_ALIASES, LEGACY_MEMBERS, PERMANENT_ENTRIES } from './legacy-names';
import { Collections, LEGACY_FIELD_NAMES, LEGACY_STORAGE_NAMES } from './storage';

const FIX = 'Name collections through Collections and fields and values through src/lib/domain/storage.ts and records.ts.';

function parse(file: string): ts.SourceFile {
  return ts.createSourceFile(file, readFileSync(path.join(REPO_ROOT, file), 'utf8'), ts.ScriptTarget.Latest, true);
}

function exported(source: ts.SourceFile, name: string): boolean {
  return source.statements.some((statement) => {
    const named = ts.isTypeAliasDeclaration(statement) || ts.isEnumDeclaration(statement) || ts.isFunctionDeclaration(statement);
    const hasExport = ts.canHaveModifiers(statement) && ts.getModifiers(statement)?.some((modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword);
    if (!hasExport) return false;
    if (named) return statement.name?.text === name;
    return ts.isVariableStatement(statement) && statement.declarationList.declarations.some((declaration) => ts.isIdentifier(declaration.name) && declaration.name.text === name);
  });
}

describe('legacy-name ratchet', () => {
  let scan: LegacyNameScan;

  beforeAll(() => {
    scan = scanLegacyNames();
  }, 60_000);

  it('reads every non-test source file under src/, .d.ts files included, that no exemption covers', () => {
    const exempt = new Set(scan.exempt.map((entry) => entry.file));

    expect(scan.files.length).toBeGreaterThan(200);
    expect([...scan.files, ...exempt].sort()).toEqual(sourceFiles({ declarations: true }));
    expect(scan.files.some((file) => file.startsWith('src/lib/domain/'))).toBe(false);
  });

  it('adds no legacy storage name, alias or deprecated member to any file', () => {
    const { grown } = compareToBaseline(countByFile(scan.hits), LEGACY_NAME_BASELINE);
    const files = new Set(grown.map((line) => line.slice(0, line.indexOf(': '))));
    const sites = scan.hits.filter((hit) => files.has(hit.file)).map((hit) => `${hit.file}:${hit.line} ${hit.form} ${hit.name}`);

    expect(grown, `${FIX}\n${sites.join('\n')}`).toEqual([]);
  });

  it('matches the baseline exactly, so a removed use lowers it', () => {
    expect(countByFile(scan.hits), 'Lower or drop the entry in src/lib/domain/legacy-name-baseline.ts').toEqual(LEGACY_NAME_BASELINE);
  });

  it('lets at most one module claim the readLegacyExport exemption', () => {
    for (const [name, claimants] of Object.entries(scan.claims)) expect(claimants.length, `${name}: ${claimants.join(', ')}`).toBeLessThanOrEqual(1);
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
    const source = parse(`${LEGACY_ALIAS_MODULE}.ts`);

    expect(LEGACY_ALIASES).toHaveLength(19);
    expect(new Set(LEGACY_ALIASES).size).toBe(19);
    expect(LEGACY_ALIASES.filter((alias) => !exported(source, alias))).toEqual([]);
  });

  it('lists members that exist, named for a retired word', () => {
    const holders: Record<keyof typeof LEGACY_MEMBERS, object> = {
      Collections,
      NotificationType: pocketbaseTypes.NotificationType,
      ResourceType: pocketbaseTypes.ResourceType,
    };

    for (const [holder, members] of Object.entries(LEGACY_MEMBERS) as Array<[keyof typeof LEGACY_MEMBERS, readonly string[]]>) {
      expect(members.filter((member) => !(member in holders[holder])), holder).toEqual([]);
      expect(members.filter((member) => !/BLUEPRINT|INSTANCE|ITEM|CHECKLIST/.test(member)), holder).toEqual([]);
    }
    expect(pocketbaseTypes.Collections).toBe(Collections);
  });

  it('keeps src/lib/domain/ self-contained, so the allowlist re-exports nothing from outside it', () => {
    const domain = readdirSync(path.join(REPO_ROOT, 'src/lib/domain'))
      .map((name) => `src/lib/domain/${name}`)
      .filter((file) => /\.tsx?$/.test(file) && !isTestFile(file));
    const outside = domain.flatMap((file) =>
      parse(file)
        .statements.filter((statement) => (ts.isImportDeclaration(statement) || ts.isExportDeclaration(statement)) && statement.moduleSpecifier)
        .map((statement) => ((statement as ts.ImportDeclaration | ts.ExportDeclaration).moduleSpecifier as ts.StringLiteral).text)
        .filter((specifier) => !resolveModule(file, specifier)?.startsWith('src/lib/domain/'))
        .map((specifier) => `${file} imports ${specifier}`),
    );

    expect(domain.length).toBeGreaterThan(5);
    expect(outside).toEqual([]);
  });

  it('gives each exemption an owning leaf and a reason, and names files that exist', () => {
    const exemptions = [...ALLOWLIST, ...PERMANENT_ENTRIES];
    const malformed = exemptions.filter(
      (exemption) =>
        !exemption.path.startsWith('src/') ||
        exemption.reason.length < 20 ||
        /[\u2013\u2014]/.test(exemption.reason) ||
        (exemption.declaresFunction !== undefined && !exemption.path.endsWith('/')),
    );

    expect(malformed).toEqual([]);
    for (const exemption of exemptions) expect(() => leafIssue(exemption.owner), exemption.path).not.toThrow();
    // A file entry goes when its file goes; folder entries may wait for the leaf that adds them.
    expect(exemptions.filter((exemption) => !exemption.path.endsWith('/') && !existsSync(path.join(REPO_ROOT, exemption.path)))).toEqual([]);
  });

  it('keeps the v1 export reader and the 16.3 file form as permanent entries', () => {
    expect(PERMANENT_ENTRIES.map((entry) => [entry.path, entry.declaresFunction ?? null, `#${leafIssue(entry.owner)}`])).toEqual([
      ['src/lib/services/export/import-parsers.ts', null, '#75'],
      ['src/lib/portable/', 'readLegacyExport', '#74'],
      ['src/lib/portable/blueprint/', null, '#76'],
    ]);
    expect(ALLOWLIST.map((entry) => entry.path)).toEqual(['src/lib/domain/']);
  });
});
