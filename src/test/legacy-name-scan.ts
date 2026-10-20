/**
 * Source scan for the legacy-name ratchet (CHECKMATE-01.1 · adapter, #29,
 * test plan item 8). src/lib/domain/legacy-names.ts says what counts; this
 * file finds it. Each non-test .ts and .tsx file under src/ is parsed with the
 * TypeScript compiler API, so comments are never read and a string is told
 * apart from a module path. Every form is syntactic, so no type checker runs.
 */

import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
import { ALLOWLIST, LEGACY_ALIAS_MODULE, LEGACY_ALIASES, PERMANENT_ENTRIES, type Exemption } from '@/lib/domain/legacy-names';
import { LEGACY_COLLECTION_NAMES, LEGACY_FIELD_NAMES, LEGACY_STORAGE_NAMES } from '@/lib/domain/storage';

export const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

const STORAGE_NAMES: ReadonlySet<string> = new Set(LEGACY_STORAGE_NAMES);
const FIELD_NAMES: ReadonlySet<string> = new Set(LEGACY_FIELD_NAMES);
const COLLECTION_NAMES: ReadonlySet<string> = new Set(LEGACY_COLLECTION_NAMES);
const ALIASES: ReadonlySet<string> = new Set(LEGACY_ALIASES);

/**
 * `literal`: a whole string literal. `access`: a `.field` read. `query`: a
 * name inside a filter, expand, sort or fields string. `alias`: a deprecated
 * alias imported from pocketbase-types.ts.
 */
export type LegacyNameForm = 'literal' | 'access' | 'query' | 'alias';

export interface LegacyNameHit {
  readonly file: string;
  readonly line: number;
  readonly name: string;
  readonly form: LegacyNameForm;
}

export interface LegacyNameScan {
  /** The files read for hits. */
  readonly files: readonly string[];
  /** Files left out by the allowlist or a permanent entry. */
  readonly exempt: ReadonlyArray<{ readonly file: string; readonly by: Exemption }>;
  readonly hits: readonly LegacyNameHit[];
}

export interface LegacyNameScanOptions {
  /** Scan these repo-relative files with these contents instead of src/. */
  readonly sources?: Readonly<Record<string, string>>;
}

function isTestFile(file: string): boolean {
  return file.startsWith('src/test/') || /\.(test|typetest)\.tsx?$/.test(file) || file.endsWith('.d.ts');
}

/** Non-test .ts and .tsx files under src/, repo-relative with forward slashes. */
export function sourceFiles(root: string = REPO_ROOT): string[] {
  return readdirSync(path.join(root, 'src'), { recursive: true, encoding: 'utf8' })
    .map((entry) => path.posix.join('src', entry.split(path.sep).join('/')))
    .filter((file) => /\.tsx?$/.test(file) && !isTestFile(file))
    .sort();
}

function covers(exemption: Exemption, file: string): boolean {
  return exemption.path.endsWith('/') ? file.startsWith(exemption.path) : file === exemption.path;
}

function hasExportModifier(node: ts.Node): boolean {
  return ts.canHaveModifiers(node) && (ts.getModifiers(node) ?? []).some((modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword);
}

/** True when the module declares an export with this name itself; a re-export from another module doesn't count. */
export function declaresExport(source: ts.SourceFile, name: string): boolean {
  return source.statements.some((statement) => {
    if ((ts.isFunctionDeclaration(statement) || ts.isClassDeclaration(statement)) && hasExportModifier(statement)) {
      return statement.name?.text === name;
    }
    if (ts.isVariableStatement(statement) && hasExportModifier(statement)) {
      return statement.declarationList.declarations.some((declaration) => ts.isIdentifier(declaration.name) && declaration.name.text === name);
    }
    if (ts.isExportDeclaration(statement) && !statement.moduleSpecifier && statement.exportClause && ts.isNamedExports(statement.exportClause)) {
      return statement.exportClause.elements.some((element) => element.name.text === name);
    }
    return false;
  });
}

/** The exemption covering a file, if any. Entries with `exporting` need the parsed file. */
export function exemptionFor(file: string, source?: ts.SourceFile): Exemption | undefined {
  return [...ALLOWLIST, ...PERMANENT_ENTRIES].find(
    (exemption) => covers(exemption, file) && (!exemption.exporting || (source !== undefined && declaresExport(source, exemption.exporting))),
  );
}

/** The repo-relative module a specifier names, without extension, or undefined for a package. */
export function resolveModule(file: string, specifier: string): string | undefined {
  let target: string;
  if (specifier.startsWith('@/')) target = path.posix.join('src', specifier.slice(2));
  else if (specifier.startsWith('.')) target = path.posix.join(path.posix.dirname(file), specifier);
  else return undefined;
  return target.replace(/\.(?:[cm]?[jt]sx?)$/, '').replace(/\/index$/, '');
}

const OPERATOR = String.raw`\??(?:!=|>=|<=|!~|=|>|<|~)`;
const QUOTED = String.raw`"(?:[^"\\\n]|\\.)*"|'(?:[^'\\\n]|\\.)*'`;
const PATH = String.raw`@?[A-Za-z_]\w*(?:\.\w+)*`;
const QUOTED_ANYWHERE = new RegExp(QUOTED, 'g');
const LEFT_OPERAND = new RegExp(String.raw`(?<![\w.@])(${PATH})\s*${OPERATOR}`, 'g');
const QUOTED_OPERAND = new RegExp(String.raw`${OPERATOR}\s*(${QUOTED})`, 'g');
const LIST_ITEM = new RegExp(String.raw`^[+-]?${PATH}$`);

/** Stands in for a template literal's `${}` so the text around it stays apart. */
const SUBSTITUTION = '\u0000';

function pathNames(fieldPath: string): string[] {
  const segments = fieldPath.split('.');
  const names = segments.filter((segment) => FIELD_NAMES.has(segment));
  const collection = segments[1];
  if (segments[0] === '@collection' && collection !== undefined && COLLECTION_NAMES.has(collection)) names.push(collection);
  return names;
}

/**
 * Legacy names in a query string. A filter has at least one comparison: it
 * counts relation fields in the field path left of each operator, a legacy
 * collection after `@collection.`, and a quoted legacy value right of an
 * operator. An expand, sort or fields string is a comma list of field paths
 * (or one dotted or signed path): it counts relation fields in each path.
 * Any other string, prose included, counts nothing.
 */
export function queryNames(text: string): string[] {
  const bare = text.replace(QUOTED_ANYWHERE, '""');
  const operands = [...bare.matchAll(LEFT_OPERAND)].map((match) => match[1] ?? '');
  if (operands.length > 0) {
    const quoted = [...text.matchAll(QUOTED_OPERAND)]
      .map((match) => (match[1] ?? '').slice(1, -1))
      .filter((value) => STORAGE_NAMES.has(value));
    return [...operands.flatMap(pathNames), ...quoted];
  }
  if (bare !== text) return [];
  const items = text.split(',').map((item) => item.trim());
  const single = items.length === 1 ? (items[0] ?? '') : '';
  const isList = items.every((item) => LIST_ITEM.test(item)) && (items.length > 1 || /[.+-]/.test(single));
  return isList ? items.flatMap((item) => pathNames(item.replace(/^[+-]/, ''))) : [];
}

function rightmost(name: ts.EntityName): string {
  return ts.isIdentifier(name) ? name.text : name.right.text;
}

function scanFile(file: string, source: ts.SourceFile, hits: LegacyNameHit[]): void {
  const namespaces = new Set<string>();
  const add = (node: ts.Node, name: string, form: LegacyNameForm): void => {
    hits.push({ file, line: source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1, name, form });
  };
  const aliasModule = (specifier: ts.Node | undefined): boolean =>
    specifier !== undefined && ts.isStringLiteralLike(specifier) && resolveModule(file, specifier.text) === LEGACY_ALIAS_MODULE;
  const literal = (node: ts.Node, text: string): void => {
    if (STORAGE_NAMES.has(text)) add(node, text, 'literal');
    else for (const name of queryNames(text)) add(node, name, 'query');
  };

  const visit = (node: ts.Node): void => {
    // Module paths are never storage names: read the alias bindings and stop.
    if (ts.isImportDeclaration(node)) {
      if (aliasModule(node.moduleSpecifier)) {
        const bindings = node.importClause?.namedBindings;
        if (bindings && ts.isNamespaceImport(bindings)) namespaces.add(bindings.name.text);
        if (bindings && ts.isNamedImports(bindings)) {
          for (const element of bindings.elements) {
            const imported = (element.propertyName ?? element.name).text;
            if (ALIASES.has(imported)) add(element, imported, 'alias');
          }
        }
      }
      return;
    }
    if (ts.isExportDeclaration(node)) {
      if (aliasModule(node.moduleSpecifier) && node.exportClause && ts.isNamedExports(node.exportClause)) {
        for (const element of node.exportClause.elements) {
          const exported = (element.propertyName ?? element.name).text;
          if (ALIASES.has(exported)) add(element, exported, 'alias');
        }
      }
      if (!node.moduleSpecifier) ts.forEachChild(node, visit);
      return;
    }
    if (ts.isImportTypeNode(node)) {
      const argument = node.argument;
      if (ts.isLiteralTypeNode(argument) && aliasModule(argument.literal) && node.qualifier && ALIASES.has(rightmost(node.qualifier))) {
        add(node, rightmost(node.qualifier), 'alias');
      }
      node.typeArguments?.forEach(visit);
      return;
    }
    if (ts.isExternalModuleReference(node)) return;
    if (ts.isModuleDeclaration(node) && ts.isStringLiteral(node.name)) {
      if (node.body) visit(node.body);
      return;
    }
    if (ts.isCallExpression(node) && (node.expression.kind === ts.SyntaxKind.ImportKeyword || (ts.isIdentifier(node.expression) && node.expression.text === 'require'))) {
      node.arguments.slice(1).forEach(visit);
      return;
    }

    if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
      literal(node, node.text);
    } else if (ts.isTemplateExpression(node)) {
      const text = node.head.text + node.templateSpans.map((span) => SUBSTITUTION + span.literal.text).join('');
      for (const name of queryNames(text)) add(node, name, 'query');
      for (const span of node.templateSpans) visit(span.expression);
      return;
    } else if (ts.isPropertyAccessExpression(node)) {
      if (FIELD_NAMES.has(node.name.text)) add(node.name, node.name.text, 'access');
      if (ts.isIdentifier(node.expression) && namespaces.has(node.expression.text) && ALIASES.has(node.name.text)) {
        add(node.name, node.name.text, 'alias');
      }
    } else if (ts.isQualifiedName(node)) {
      if (ts.isIdentifier(node.left) && namespaces.has(node.left.text) && ALIASES.has(node.right.text)) add(node.right, node.right.text, 'alias');
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
}

/** Scans src/, or `options.sources`, for legacy names outside the exemptions. */
export function scanLegacyNames(options: LegacyNameScanOptions = {}): LegacyNameScan {
  const entries: Array<readonly [file: string, read: () => string]> = options.sources
    ? Object.entries(options.sources).map(([file, text]) => [file, () => text] as const)
    : sourceFiles().map((file) => [file, () => readFileSync(path.join(REPO_ROOT, file), 'utf8')] as const);
  const files: string[] = [];
  const exempt: Array<{ file: string; by: Exemption }> = [];
  const hits: LegacyNameHit[] = [];
  for (const [file, read] of entries) {
    if (isTestFile(file)) continue;
    const early = ALLOWLIST.concat(PERMANENT_ENTRIES).find((exemption) => !exemption.exporting && covers(exemption, file));
    if (early) {
      exempt.push({ file, by: early });
      continue;
    }
    const kind = file.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS;
    const source = ts.createSourceFile(file, read(), ts.ScriptTarget.Latest, true, kind);
    const by = exemptionFor(file, source);
    if (by) {
      exempt.push({ file, by });
      continue;
    }
    files.push(file);
    scanFile(file, source, hits);
  }
  return { files, exempt, hits };
}

/** Hits per file, for files that have any. */
export function countByFile(hits: readonly LegacyNameHit[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const hit of hits) counts[hit.file] = (counts[hit.file] ?? 0) + 1;
  return counts;
}

export interface BaselineDiff {
  /** Files above their baseline count, new files included. Each fails the ratchet. */
  readonly grown: readonly string[];
  /** Files below their baseline count, gone files included. Lower the baseline to match. */
  readonly shrunk: readonly string[];
}

/** Compares per-file counts with the baseline. */
export function compareToBaseline(found: Readonly<Record<string, number>>, baseline: Readonly<Record<string, number>>): BaselineDiff {
  const grown: string[] = [];
  const shrunk: string[] = [];
  for (const file of [...new Set([...Object.keys(found), ...Object.keys(baseline)])].sort()) {
    const now = found[file] ?? 0;
    const before = baseline[file] ?? 0;
    if (now > before) grown.push(before === 0 ? `${file}: ${now}, not in the baseline` : `${file}: ${before} raised to ${now}`);
    else if (now < before) shrunk.push(`${file}: ${before} lowered to ${now}`);
  }
  return { grown, shrunk };
}
