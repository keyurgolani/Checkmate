/**
 * Source scan for the legacy-name ratchet (CHECKMATE-01.1 · adapter, #29,
 * test plan item 8). src/lib/domain/legacy-names.ts says what counts; this
 * file finds it. Each non-test .ts, .tsx and .d.ts file under src/ is parsed
 * with the TypeScript compiler API, so comments are never read and a string is
 * told apart from a module path. Every form is syntactic, so no type checker
 * runs. Aliases are followed within a file, through every way of importing or
 * re-exporting them.
 */

import { readFileSync } from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
import { ALLOWLIST, LEGACY_ALIAS_MODULE, LEGACY_ALIASES, LEGACY_MEMBERS, PERMANENT_ENTRIES, type Exemption } from '@/lib/domain/legacy-names';
import { LEGACY_COLLECTION_NAMES, LEGACY_FIELD_NAMES, LEGACY_STORAGE_NAMES } from '@/lib/domain/storage';
import { REPO_ROOT, isTestFile, sourceFiles } from './source-files';

export { REPO_ROOT };

const STORAGE_NAMES: ReadonlySet<string> = new Set(LEGACY_STORAGE_NAMES);
const FIELD_NAMES: ReadonlySet<string> = new Set(LEGACY_FIELD_NAMES);
const COLLECTION_NAMES: ReadonlySet<string> = new Set(LEGACY_COLLECTION_NAMES);
const ALIASES: ReadonlySet<string> = new Set(LEGACY_ALIASES);
const MEMBERS: ReadonlyMap<string, ReadonlySet<string>> = new Map(
  Object.entries(LEGACY_MEMBERS).map(([holder, members]) => [holder, new Set<string>(members)]),
);
const DOMAIN = 'src/lib/domain/';

/**
 * `literal`: a whole string literal or template chunk. `url`: a collection
 * URL. `access`: a `.field` read. `key`: an object key, shorthand or
 * destructured name. `member`: an interface or type literal member. `query`: a name inside
 * a filter, expand, sort or fields string. `alias`: a deprecated alias
 * imported or re-exported. `deprecated`: a use of a member in LEGACY_MEMBERS.
 */
export type LegacyNameForm = 'literal' | 'url' | 'access' | 'key' | 'member' | 'query' | 'alias' | 'deprecated';

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
  /** For each `declaresFunction` entry, the modules that claim it. Only a sole claimant is exempt. */
  readonly claims: Readonly<Record<string, readonly string[]>>;
}

export interface LegacyNameScanOptions {
  /** Scan these repo-relative files with these contents instead of src/. */
  readonly sources?: Readonly<Record<string, string>>;
}

function covers(exemption: Exemption, file: string): boolean {
  return exemption.path.endsWith('/') ? file.startsWith(exemption.path) : file === exemption.path;
}

function hasExportModifier(node: ts.Node): boolean {
  return ts.canHaveModifiers(node) && (ts.getModifiers(node) ?? []).some((modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword);
}

/** True when the module has `export function <name>` at its top level. Nothing else counts. */
export function declaresExportedFunction(source: ts.SourceFile, name: string): boolean {
  return source.statements.some((statement) => ts.isFunctionDeclaration(statement) && hasExportModifier(statement) && statement.name?.text === name);
}

/** The repo-relative module a specifier names, without extension, or undefined for a package. */
export function resolveModule(file: string, specifier: string): string | undefined {
  let target: string;
  if (specifier.startsWith('@/')) target = path.posix.join('src', specifier.slice(2));
  else if (specifier.startsWith('.')) target = path.posix.join(path.posix.dirname(file), specifier);
  else return undefined;
  return target.replace(/\.(?:d\.)?(?:[cm]?[jt]sx?)$/, '').replace(/\/index$/, '');
}

/** Stands in for a template literal's `${}` so the text around it stays apart. */
const SUBSTITUTION = '\u0000';

type Token =
  | { readonly kind: 'path'; readonly text: string; readonly end: number }
  | { readonly kind: 'quoted'; readonly text: string; readonly closed: boolean }
  | { readonly kind: 'value' | 'op' | 'logic' | 'comma' | 'close' }
  | { readonly kind: 'open'; readonly start: number };

const SEGMENT = String.raw`@?[A-Za-z_]\w*(?::\w+)?`;
const TOKEN = new RegExp(
  [
    String.raw`(?<space>\s+)`,
    String.raw`(?<quoted>"(?:[^"\\]|\\.)*(?:"|$)|'(?:[^'\\]|\\.)*(?:'|$))`,
    String.raw`(?<value>\{:\w+\}|${SUBSTITUTION}|-?\d+(?:\.\d+)?)`,
    String.raw`(?<path>${SEGMENT}(?:\.${SEGMENT})*)`,
    String.raw`(?<op>\?(?:!=|>=|<=|!~|=|>|<|~)|!=|>=|<=|!~|=|>|<|~)`,
    String.raw`(?<logic>&&|\|\|)`,
    String.raw`(?<open>\()`,
    String.raw`(?<close>\))`,
    String.raw`(?<comma>,)`,
  ].join('|'),
  'y',
);

/** The filter tokens of a string, or undefined when it holds anything a filter can't. */
function tokenize(text: string): Token[] | undefined {
  const tokens: Token[] = [];
  TOKEN.lastIndex = 0;
  while (TOKEN.lastIndex < text.length) {
    const start = TOKEN.lastIndex;
    const match = TOKEN.exec(text);
    const groups = match?.groups;
    if (!match || !groups) return undefined;
    if (groups.space !== undefined) continue;
    if (groups.quoted !== undefined) {
      const quoted = groups.quoted;
      tokens.push({ kind: 'quoted', text: quoted, closed: quoted.length > 1 && quoted.endsWith(quoted.charAt(0)) });
    } else if (groups.path !== undefined) tokens.push({ kind: 'path', text: groups.path, end: TOKEN.lastIndex });
    else if (groups.open !== undefined) tokens.push({ kind: 'open', start });
    else if (groups.value !== undefined) tokens.push({ kind: 'value' });
    else if (groups.op !== undefined) tokens.push({ kind: 'op' });
    else if (groups.logic !== undefined) tokens.push({ kind: 'logic' });
    else if (groups.close !== undefined) tokens.push({ kind: 'close' });
    else tokens.push({ kind: 'comma' });
  }
  return tokens;
}

type Operand = { readonly kind: 'path' | 'quoted' | 'value' | 'call'; readonly names: readonly string[] };
type Item = Operand | { readonly kind: 'op' | 'logic' };

function quotedNames(token: Token & { kind: 'quoted' }): string[] {
  const value = token.text.slice(1, -1);
  return token.closed && STORAGE_NAMES.has(value) ? [value] : [];
}

/**
 * Legacy names in one field path: relation fields in any segment, a
 * back-relation's collection and field (`instanceItems_via_instance`), and a
 * collection after `@collection.`. Modifiers such as `:length` are dropped.
 */
function pathNames(fieldPath: string): string[] {
  const segments = fieldPath.split('.').map((segment) => segment.replace(/:.*$/, ''));
  return segments.flatMap((segment, index) => {
    if (index === 1 && segments[0] === '@collection') return COLLECTION_NAMES.has(segment) ? [segment] : [];
    const via = segment.indexOf('_via_');
    if (via > 0) {
      const collection = segment.slice(0, via);
      const field = segment.slice(via + '_via_'.length);
      return [...(COLLECTION_NAMES.has(collection) ? [collection] : []), ...(FIELD_NAMES.has(field) ? [field] : [])];
    }
    return FIELD_NAMES.has(segment) ? [segment] : [];
  });
}

/** Turns tokens into operands, operators and connectives. A path right before `(` is a function call. */
function items(tokens: readonly Token[]): Item[] | undefined {
  const result: Item[] = [];
  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index];
    if (!token) break;
    const next = tokens[index + 1];
    if (token.kind === 'path' && next?.kind === 'open' && next.start === token.end) {
      const names: string[] = [];
      let depth = 0;
      for (index += 1; index < tokens.length; index += 1) {
        const inner = tokens[index];
        if (!inner) break;
        if (inner.kind === 'open') depth += 1;
        else if (inner.kind === 'close') depth -= 1;
        else if (inner.kind === 'path') names.push(...pathNames(inner.text));
        else if (inner.kind === 'quoted') names.push(...quotedNames(inner));
        if (depth === 0) break;
      }
      if (depth !== 0) return undefined;
      result.push({ kind: 'call', names });
    } else if (token.kind === 'path') result.push({ kind: 'path', names: pathNames(token.text) });
    else if (token.kind === 'quoted') result.push({ kind: 'quoted', names: quotedNames(token) });
    else if (token.kind === 'value') result.push({ kind: 'value', names: [] });
    else if (token.kind === 'op' || token.kind === 'logic') result.push({ kind: token.kind });
    else if (token.kind === 'comma') return undefined;
    // Parentheses only group.
  }
  return result;
}

function isOperand(item: Item | undefined): item is Operand {
  return item !== undefined && item.kind !== 'op' && item.kind !== 'logic';
}

/**
 * Legacy names in a filter, or undefined when the text isn't one. A filter is
 * one or more comparisons joined by `&&` or `||`; a piece of one may start or
 * end with a connective, or end right after an operator. Both sides of every
 * comparison are read.
 */
function filterNames(text: string): string[] | undefined {
  const tokens = tokenize(text);
  const sequence = tokens && items(tokens);
  if (!sequence) return undefined;
  const names: string[] = [];
  let index = sequence[0]?.kind === 'logic' ? 1 : 0;
  let comparisons = 0;
  while (index < sequence.length) {
    const left = sequence[index];
    if (!isOperand(left) || sequence[index + 1]?.kind !== 'op') return undefined;
    names.push(...left.names);
    comparisons += 1;
    const right = sequence[index + 2];
    if (right === undefined) break;
    if (!isOperand(right)) return undefined;
    names.push(...right.names);
    index += 3;
    if (index < sequence.length && sequence[index]?.kind !== 'logic') return undefined;
    index += 1;
  }
  return comparisons > 0 ? names : undefined;
}

const LIST_SEGMENT = String.raw`@?[A-Za-z_]\w*(?::\w+(?:\([^()]*\))?)?`;
const LIST_ITEM = new RegExp(String.raw`^[+-]?${LIST_SEGMENT}(?:\.${LIST_SEGMENT})*$`);

function splitTopLevel(text: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let start = 0;
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (char === '(') depth += 1;
    else if (char === ')') depth -= 1;
    else if (char === ',' && depth === 0) {
      parts.push(text.slice(start, index).trim());
      start = index + 1;
    }
  }
  parts.push(text.slice(start).trim());
  return parts;
}

/** Legacy names in an expand, sort or fields list, or undefined when the text isn't one. A single bare word isn't a list. */
function listNames(text: string): string[] | undefined {
  const parts = splitTopLevel(text);
  const paths = parts.filter((part) => part !== SUBSTITUTION);
  if (paths.length === 0 || !paths.every((part) => LIST_ITEM.test(part))) return undefined;
  if (parts.length === 1 && !/[.+:-]|_via_/.test(paths[0] ?? '')) return undefined;
  return paths.flatMap((part) => pathNames(part.replace(/^[+-]/, '')));
}

/**
 * Legacy names in a query string: a filter (both sides of each comparison,
 * back-relations, `@collection.`, quoted values) or an expand, sort or fields
 * list. Any other string, prose included, counts nothing.
 */
export function queryNames(text: string): string[] {
  return filterNames(text) ?? listNames(text) ?? [];
}

const COLLECTION_URL = /\/api\/collections\/([A-Za-z_]\w*)/g;

/** Legacy collections named in collection URLs, such as `/api/collections/blueprints/records`. */
export function urlNames(text: string): string[] {
  return [...text.matchAll(COLLECTION_URL)].map((match) => match[1] ?? '').filter((name) => COLLECTION_NAMES.has(name));
}

function nameText(name: ts.Node | undefined): string | undefined {
  return name && (ts.isIdentifier(name) || ts.isPrivateIdentifier(name)) ? name.text : undefined;
}

function unwrap(node: ts.Node): ts.Node {
  let current = node;
  while (ts.isParenthesizedExpression(current) || ts.isAwaitExpression(current) || ts.isAsExpression(current) || ts.isNonNullExpression(current)) {
    current = current.expression;
  }
  return current;
}

function scanFile(file: string, source: ts.SourceFile, hits: LegacyNameHit[]): void {
  /** Local names bound to an alias, to the name of the alias. */
  const aliasLocals = new Map<string, string>();
  /** Local names bound to the whole alias module. */
  const namespaces = new Set<string>();
  /** Local names bound to a holder in LEGACY_MEMBERS, to the holder's name. */
  const holders = new Map<string, string>([...MEMBERS.keys()].map((holder) => [holder, holder]));

  const add = (node: ts.Node, name: string, form: LegacyNameForm): void => {
    hits.push({ file, line: source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1, name, form });
  };
  const target = (specifier: ts.Node | undefined): string | undefined =>
    specifier && ts.isStringLiteralLike(specifier) ? resolveModule(file, specifier.text) : undefined;
  /** The alias module itself. A barrel `export *` counts only from here. */
  const isAliasModule = (specifier: ts.Node | undefined): boolean => target(specifier) === LEGACY_ALIAS_MODULE;
  /** The alias module, or a domain module, which may not re-export an alias under its old name either. */
  const fromAliases = (specifier: ts.Node | undefined): boolean => {
    const resolved = target(specifier);
    return resolved === LEGACY_ALIAS_MODULE || (resolved !== undefined && resolved.startsWith(DOMAIN));
  };
  const text = (node: ts.Node): void => {
    const value = (node as ts.StringLiteralLike).text;
    if (STORAGE_NAMES.has(value)) add(node, value, 'literal');
    else for (const name of queryNames(value)) add(node, name, 'query');
    for (const name of urlNames(value)) add(node, name, 'url');
  };
  /** `PB.X`, `PB['X']` or `Collections.ITEMS` style member reads. */
  const member = (node: ts.Node, holder: ts.Node, name: string | undefined): void => {
    if (name === undefined) return;
    const target = unwrap(holder);
    if (ts.isIdentifier(target)) {
      if (namespaces.has(target.text) && ALIASES.has(name)) add(node, name, 'alias');
      const held = holders.get(target.text);
      if (held && MEMBERS.get(held)?.has(name)) add(node, name, 'deprecated');
    } else if (ts.isPropertyAccessExpression(target) && ts.isIdentifier(target.expression) && namespaces.has(target.expression.text)) {
      if (MEMBERS.get(target.name.text)?.has(name)) add(node, name, 'deprecated');
    }
  };
  /** A destructuring of `holder` (an alias namespace or a LEGACY_MEMBERS holder): each bound name that counts. */
  const destructure = (pattern: ts.ObjectBindingPattern, holder: ts.Node): void => {
    const target = unwrap(holder);
    for (const element of pattern.elements) {
      const name = nameText(element.propertyName ?? element.name) ?? (element.propertyName && ts.isStringLiteral(element.propertyName) ? element.propertyName.text : undefined);
      if (name !== undefined) member(element, target, name);
    }
  };
  const isAliasModuleCall = (node: ts.Node): node is ts.CallExpression =>
    ts.isCallExpression(node) &&
    (node.expression.kind === ts.SyntaxKind.ImportKeyword || (ts.isIdentifier(node.expression) && node.expression.text === 'require')) &&
    fromAliases(node.arguments[0]);
  /** A type that is an alias under another name: the alias itself, or a union, intersection, array or readonly form of one. */
  const isAliasType = (type: ts.TypeNode): boolean => {
    if (ts.isParenthesizedTypeNode(type) || ts.isTypeOperatorNode(type)) return isAliasType(type.type);
    if (ts.isArrayTypeNode(type)) return isAliasType(type.elementType);
    if (ts.isUnionTypeNode(type) || ts.isIntersectionTypeNode(type)) return type.types.some(isAliasType);
    if (!ts.isTypeReferenceNode(type)) return false;
    const name = type.typeName;
    if (ts.isIdentifier(name)) return aliasLocals.has(name.text);
    return ts.isIdentifier(name.left) && namespaces.has(name.left.text) && ALIASES.has(name.right.text);
  };

  const visit = (node: ts.Node): void => {
    // Module paths are never storage names: read the bindings and stop.
    if (ts.isImportDeclaration(node)) {
      const clause = node.importClause;
      const bindings = clause?.namedBindings;
      if (fromAliases(node.moduleSpecifier)) {
        if (bindings && ts.isNamespaceImport(bindings)) namespaces.add(bindings.name.text);
        if (bindings && ts.isNamedImports(bindings)) {
          for (const element of bindings.elements) {
            const imported = (element.propertyName ?? element.name).text;
            if (ALIASES.has(imported)) {
              add(element, imported, 'alias');
              aliasLocals.set(element.name.text, imported);
            }
          }
        }
      }
      if (bindings && ts.isNamedImports(bindings)) {
        for (const element of bindings.elements) {
          const imported = (element.propertyName ?? element.name).text;
          if (MEMBERS.has(imported)) holders.set(element.name.text, imported);
        }
      }
      return;
    }
    if (ts.isImportEqualsDeclaration(node)) {
      if (ts.isExternalModuleReference(node.moduleReference) && fromAliases(node.moduleReference.expression)) namespaces.add(node.name.text);
      return;
    }
    if (ts.isExportDeclaration(node)) {
      if (node.moduleSpecifier) {
        if (!node.exportClause || ts.isNamespaceExport(node.exportClause)) {
          if (isAliasModule(node.moduleSpecifier)) add(node, '*', 'alias');
        } else if (fromAliases(node.moduleSpecifier)) {
          for (const element of node.exportClause.elements) {
            const exported = (element.propertyName ?? element.name).text;
            if (ALIASES.has(exported)) add(element, exported, 'alias');
          }
        }
        return;
      }
      if (node.exportClause && ts.isNamedExports(node.exportClause)) {
        for (const element of node.exportClause.elements) {
          const local = (element.propertyName ?? element.name).text;
          const alias = aliasLocals.get(local);
          if (alias) add(element, alias, 'alias');
          else if (namespaces.has(local)) add(element, '*', 'alias');
        }
      }
      return;
    }
    if (ts.isExportAssignment(node) && ts.isIdentifier(node.expression)) {
      const alias = aliasLocals.get(node.expression.text);
      if (alias) add(node, alias, 'alias');
    }
    if (ts.isTypeAliasDeclaration(node) && hasExportModifier(node) && isAliasType(node.type)) add(node.name, node.name.text, 'alias');
    if (ts.isVariableStatement(node) && hasExportModifier(node)) {
      for (const declaration of node.declarationList.declarations) {
        const init = declaration.initializer && unwrap(declaration.initializer);
        if (init && ts.isIdentifier(init) && aliasLocals.has(init.text)) add(declaration.name, aliasLocals.get(init.text) ?? '', 'alias');
      }
    }
    if (ts.isImportTypeNode(node)) {
      const argument = node.argument;
      if (ts.isLiteralTypeNode(argument) && fromAliases(argument.literal) && node.qualifier) {
        const name = ts.isIdentifier(node.qualifier) ? node.qualifier.text : node.qualifier.right.text;
        if (ALIASES.has(name)) add(node, name, 'alias');
      }
      node.typeArguments?.forEach(visit);
      return;
    }
    if (ts.isModuleDeclaration(node) && ts.isStringLiteral(node.name)) {
      if (node.body) visit(node.body);
      return;
    }
    if (ts.isCallExpression(node) && (node.expression.kind === ts.SyntaxKind.ImportKeyword || (ts.isIdentifier(node.expression) && node.expression.text === 'require'))) {
      if (isAliasModuleCall(node)) {
        // `const PB = await import(...)`, `const { isTask } = require(...)`, `(await import(...)).isTask`.
        let outer: ts.Node = node;
        while (outer.parent && (ts.isAwaitExpression(outer.parent) || ts.isParenthesizedExpression(outer.parent))) outer = outer.parent;
        const parent = outer.parent;
        if (parent && ts.isVariableDeclaration(parent) && parent.initializer === outer) {
          if (ts.isIdentifier(parent.name)) namespaces.add(parent.name.text);
          else if (ts.isObjectBindingPattern(parent.name)) {
            for (const element of parent.name.elements) {
              const name = nameText(element.propertyName ?? element.name);
              if (name !== undefined && ALIASES.has(name)) add(element, name, 'alias');
            }
          }
        } else if (parent && ts.isPropertyAccessExpression(parent) && ALIASES.has(parent.name.text)) {
          add(parent.name, parent.name.text, 'alias');
        } else if (parent && ts.isElementAccessExpression(parent) && ts.isStringLiteralLike(parent.argumentExpression) && ALIASES.has(parent.argumentExpression.text)) {
          add(parent.argumentExpression, parent.argumentExpression.text, 'alias');
        }
      }
      node.arguments.slice(1).forEach(visit);
      return;
    }

    if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
      text(node);
    } else if (ts.isTemplateExpression(node)) {
      const chunks = [node.head, ...node.templateSpans.map((span) => span.literal)];
      for (const chunk of chunks) if (STORAGE_NAMES.has(chunk.text)) add(chunk, chunk.text, 'literal');
      const joined = chunks.map((chunk) => chunk.text).join(SUBSTITUTION);
      for (const name of queryNames(joined)) add(node, name, 'query');
      for (const name of urlNames(joined)) add(node, name, 'url');
      for (const span of node.templateSpans) visit(span.expression);
      return;
    } else if (ts.isPropertyAccessExpression(node)) {
      if (FIELD_NAMES.has(node.name.text)) add(node.name, node.name.text, 'access');
      member(node.name, node.expression, node.name.text);
    } else if (ts.isElementAccessExpression(node) && ts.isStringLiteralLike(node.argumentExpression)) {
      member(node.argumentExpression, node.expression, node.argumentExpression.text);
    } else if (ts.isQualifiedName(node)) {
      member(node.right, node.left, node.right.text);
    } else if ((ts.isPropertyAssignment(node) || ts.isShorthandPropertyAssignment(node)) && ts.isIdentifier(node.name)) {
      if (FIELD_NAMES.has(node.name.text)) add(node.name, node.name.text, 'key');
    } else if (ts.isBindingElement(node) && ts.isObjectBindingPattern(node.parent)) {
      const key = node.propertyName ?? node.name;
      if (ts.isIdentifier(key) && FIELD_NAMES.has(key.text)) add(key, key.text, 'key');
    } else if (ts.isPropertySignature(node) && ts.isIdentifier(node.name)) {
      if (FIELD_NAMES.has(node.name.text)) add(node.name, node.name.text, 'member');
    } else if (ts.isVariableDeclaration(node) && ts.isObjectBindingPattern(node.name) && node.initializer) {
      destructure(node.name, node.initializer);
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
}

/** Scans src/, or `options.sources`, for legacy names outside the exemptions. */
export function scanLegacyNames(options: LegacyNameScanOptions = {}): LegacyNameScan {
  const entries: Array<readonly [file: string, read: () => string]> = options.sources
    ? Object.entries(options.sources).map(([file, contents]) => [file, () => contents] as const)
    : sourceFiles({ declarations: true }).map((file) => [file, () => readFileSync(path.join(REPO_ROOT, file), 'utf8')] as const);
  const exempt: Array<{ file: string; by: Exemption }> = [];
  const parsed: Array<{ file: string; source: ts.SourceFile }> = [];
  const exemptions = [...ALLOWLIST, ...PERMANENT_ENTRIES];
  for (const [file, read] of entries) {
    if (isTestFile(file)) continue;
    const by = exemptions.find((exemption) => !exemption.declaresFunction && covers(exemption, file));
    if (by) {
      exempt.push({ file, by });
      continue;
    }
    const kind = file.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS;
    parsed.push({ file, source: ts.createSourceFile(file, read(), ts.ScriptTarget.Latest, true, kind) });
  }

  // An entry that names a function exempts its module only while exactly one module claims it.
  const claims: Record<string, string[]> = {};
  const claimed = new Map<string, Exemption>();
  for (const exemption of exemptions) {
    if (!exemption.declaresFunction) continue;
    const name = exemption.declaresFunction;
    const claimants = parsed.filter(({ file, source }) => covers(exemption, file) && declaresExportedFunction(source, name)).map(({ file }) => file);
    claims[name] = claimants;
    const [sole] = claimants;
    if (sole !== undefined && claimants.length === 1) claimed.set(sole, exemption);
  }

  const files: string[] = [];
  const hits: LegacyNameHit[] = [];
  for (const { file, source } of parsed) {
    const by = claimed.get(file);
    if (by) {
      exempt.push({ file, by });
      continue;
    }
    files.push(file);
    scanFile(file, source, hits);
  }
  return { files, exempt, hits, claims };
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
