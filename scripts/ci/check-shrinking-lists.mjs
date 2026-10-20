#!/usr/bin/env node
/**
 * Lists that may only shrink (#30, CHECKMATE-01.2 · envelope; #29,
 * CHECKMATE-01.1 · adapter): a change may lower an entry's count or drop the
 * entry, never raise a count or add an entry. Each list is compared with its
 * copy at the merge base.
 *
 * A list is a module with one exported object literal of `'entry': count`
 * properties, read with the TypeScript parser. Anything the check can't read
 * exactly fails it. An entry whose file git sees renamed keeps its count under
 * the new path, so a move with the same or lower count passes. A list the
 * merge base checks must still exist and be checked at head, under its own
 * name or one git sees it renamed to, until it is empty.
 *
 *   node scripts/ci/check-shrinking-lists.mjs --base <sha> [--head <ref>]
 */

import { execFileSync } from 'node:child_process';
import { parseArgs } from 'node:util';
import ts from 'typescript';
import { isMain, REPO_ROOT } from './lib/actions.mjs';

/** Files holding a `{ 'entry': count }` object literal. */
export const SHRINKING_LISTS = ['src/lib/api/codeless-error-bodies.ts', 'src/lib/domain/legacy-name-baseline.ts'];

/** This script, whose `SHRINKING_LISTS` at the merge base says which lists must survive. */
export const SCRIPT = 'scripts/ci/check-shrinking-lists.mjs';

function hasExport(statement) {
  return ts.canHaveModifiers(statement) && (ts.getModifiers(statement) ?? []).some((modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword);
}

function unwrap(expression) {
  let current = expression;
  while (current && (ts.isAsExpression(current) || ts.isSatisfiesExpression(current) || ts.isParenthesizedExpression(current))) current = current.expression;
  return current;
}

/**
 * The counts in a list module. Throws unless the module exports exactly one
 * thing, a const whose value is an object literal of string-keyed entries with
 * non-negative integer literal counts, each key once.
 * @param {string} text
 * @param {string} [file]
 * @returns {Record<string, number>}
 */
export function parseCounts(text, file = 'list.ts') {
  const source = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  const at = (node) => `${file}:${source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1}`;
  const exports = source.statements.filter((statement) => hasExport(statement) || ts.isExportDeclaration(statement) || ts.isExportAssignment(statement));
  const [statement] = exports;
  const declarations = statement && ts.isVariableStatement(statement) ? statement.declarationList.declarations : [];
  const [declaration] = declarations;
  const object = declaration && unwrap(declaration.initializer);
  if (exports.length !== 1 || declarations.length !== 1 || !object || !ts.isObjectLiteralExpression(object)) {
    throw new Error(`${file}: a shrinking list exports exactly one const object literal`);
  }
  /** @type {Record<string, number>} */
  const counts = {};
  for (const property of object.properties) {
    if (!ts.isPropertyAssignment(property) || !ts.isStringLiteral(property.name)) {
      throw new Error(`${at(property)}: each entry is a quoted path and a count, with no spread, shorthand or computed key`);
    }
    const key = property.name.text;
    const count = property.initializer.getText(source);
    if (!ts.isNumericLiteral(property.initializer) || !/^\d+$/.test(count)) throw new Error(`${at(property)}: ${key} needs a whole-number count`);
    if (Object.hasOwn(counts, key)) throw new Error(`${at(property)}: ${key} is listed twice`);
    counts[key] = Number(count);
  }
  return counts;
}

/**
 * The `SHRINKING_LISTS` paths in a copy of this script, or none when it has
 * no such array of string literals.
 * @param {string | undefined} text
 * @returns {string[]}
 */
export function listedIn(text) {
  if (text === undefined) return [];
  const source = ts.createSourceFile(SCRIPT, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
  for (const statement of source.statements) {
    if (!ts.isVariableStatement(statement)) continue;
    for (const declaration of statement.declarationList.declarations) {
      const value = unwrap(declaration.initializer);
      if (ts.isIdentifier(declaration.name) && declaration.name.text === 'SHRINKING_LISTS' && value && ts.isArrayLiteralExpression(value)) {
        return value.elements.filter(ts.isStringLiteralLike).map((element) => element.text);
      }
    }
  }
  return [];
}

/**
 * New path to old path for each file `git diff --name-status -M -z` reports renamed.
 * @param {string} output
 * @returns {Map<string, string>}
 */
export function parseRenames(output) {
  const parts = output.split('\0');
  /** @type {Map<string, string>} */
  const renames = new Map();
  for (let index = 0; index < parts.length; ) {
    const status = parts[index] ?? '';
    index += 1;
    if (!status) continue;
    if (/^[RC]/.test(status)) {
      const from = parts[index] ?? '';
      const to = parts[index + 1] ?? '';
      index += 2;
      if (status.startsWith('R')) renames.set(to, from);
    } else {
      index += 1;
    }
  }
  return renames;
}

/**
 * Each entry the head adds or raises against the base. An entry git renamed
 * keeps the count of the path it was renamed from.
 * @param {Record<string, number>} base
 * @param {Record<string, number>} head
 * @param {Map<string, string>} [renames] new path to old path
 * @returns {string[]}
 */
export function growth(base, head, renames = new Map()) {
  const grown = [];
  for (const [entry, count] of Object.entries(head)) {
    const from = Object.hasOwn(base, entry) ? entry : renames.get(entry);
    const before = from !== undefined && Object.hasOwn(base, from) ? base[from] : undefined;
    if (before === undefined) grown.push(`${entry}: added with ${count}`);
    else if (count > before) grown.push(`${entry}: ${before} raised to ${count}${from === entry ? '' : ` (moved from ${from})`}`);
  }
  return grown;
}

/**
 * Everything wrong with the lists between the merge base and head.
 * @param {{
 *   baseLists: string[],
 *   headLists: string[],
 *   atBase: (file: string) => string | undefined,
 *   atHead: (file: string) => string | undefined,
 *   renames: Map<string, string>,
 * }} input
 * @returns {string[]}
 */
export function checkLists({ baseLists, headLists, atBase, atHead, renames }) {
  const problems = [];
  const read = (text, file) => {
    try {
      return parseCounts(text, file);
    } catch (error) {
      problems.push(error instanceof Error ? error.message : String(error));
      return undefined;
    }
  };
  const movedTo = (file) => [...renames].find(([, from]) => from === file)?.[0];

  for (const file of baseLists) {
    const before = atBase(file);
    if (before === undefined) continue;
    const now = movedTo(file) ?? file;
    const counts = read(before, file);
    if (counts && Object.keys(counts).length > 0 && (atHead(now) === undefined || !headLists.includes(now))) {
      problems.push(`${file}: a shrinking list with entries must stay, and stay in SHRINKING_LISTS, until it is empty`);
    }
  }
  for (const file of headLists) {
    const after = atHead(file);
    if (after === undefined) {
      problems.push(`${file}: listed in SHRINKING_LISTS but missing`);
      continue;
    }
    const head = read(after, file);
    const from = atBase(file) !== undefined ? file : renames.get(file);
    const before = from === undefined ? undefined : atBase(from);
    const base = before === undefined ? undefined : read(before, from);
    if (!head || !base) continue;
    const grown = growth(base, head, renames);
    if (grown.length > 0) problems.push(`${file} may only shrink:\n${grown.map((line) => `  ${line}`).join('\n')}`);
  }
  return problems;
}

function git(args) {
  return execFileSync('git', args, { cwd: REPO_ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
}

/** The file at a commit, or undefined when it doesn't exist there. */
function fileAt(ref, file) {
  try {
    return git(['show', `${ref}:${file}`]);
  } catch {
    return undefined;
  }
}

function main() {
  const { values } = parseArgs({ options: { base: { type: 'string' }, head: { type: 'string', default: 'HEAD' } } });
  if (!values.base) {
    console.error('Usage: node scripts/ci/check-shrinking-lists.mjs --base <sha> [--head <ref>]');
    process.exitCode = 2;
    return;
  }
  const mergeBase = git(['merge-base', values.base, values.head]).trim();
  const problems = checkLists({
    baseLists: listedIn(fileAt(mergeBase, SCRIPT)),
    headLists: SHRINKING_LISTS,
    atBase: (file) => fileAt(mergeBase, file),
    atHead: (file) => fileAt(values.head, file),
    renames: parseRenames(git(['diff', '--name-status', '-M', '-z', mergeBase, values.head])),
  });
  for (const problem of problems) console.error(`check-shrinking-lists: ${problem}`);
  if (problems.length === 0) console.log(`check-shrinking-lists: ${SHRINKING_LISTS.length} list(s) shrink or hold against ${mergeBase.slice(0, 12)}.`);
  process.exitCode = problems.length > 0 ? 1 : 0;
}

if (isMain(import.meta.url)) main();
