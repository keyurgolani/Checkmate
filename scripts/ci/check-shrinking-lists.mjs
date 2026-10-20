#!/usr/bin/env node
/**
 * Lists that may only shrink (#30, CHECKMATE-01.2 · envelope): a change may
 * lower an entry's count or drop the entry, never raise a count or add an
 * entry. Each list is compared with its copy at the merge base.
 *
 *   node scripts/ci/check-shrinking-lists.mjs --base <sha> [--head <ref>]
 */

import { execFileSync } from 'node:child_process';
import { parseArgs } from 'node:util';
import { isMain, REPO_ROOT } from './lib/actions.mjs';

/** Files holding a `{ 'entry': count }` object literal, one entry per line. */
export const SHRINKING_LISTS = ['src/lib/api/codeless-error-bodies.ts'];

const ENTRY = /^\s*'([^']+)':\s*(\d+),?\s*$/gm;

/**
 * @param {string} text
 * @returns {Record<string, number>}
 */
export function parseCounts(text) {
  /** @type {Record<string, number>} */
  const counts = {};
  for (const match of text.matchAll(ENTRY)) counts[match[1]] = Number(match[2]);
  return counts;
}

/**
 * Each entry the head adds or raises against the base.
 * @param {Record<string, number>} base
 * @param {Record<string, number>} head
 * @returns {string[]}
 */
export function growth(base, head) {
  const grown = [];
  for (const [entry, count] of Object.entries(head)) {
    const before = base[entry];
    if (before === undefined) grown.push(`${entry}: added with ${count}`);
    else if (count > before) grown.push(`${entry}: ${before} raised to ${count}`);
  }
  return grown;
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
  let failed = false;
  for (const file of SHRINKING_LISTS) {
    const before = fileAt(mergeBase, file);
    const after = fileAt(values.head, file);
    if (before === undefined || after === undefined) continue;
    const grown = growth(parseCounts(before), parseCounts(after));
    if (grown.length > 0) {
      console.error(`check-shrinking-lists: ${file} may only shrink against ${mergeBase.slice(0, 12)}:\n${grown.map((line) => `  ${line}`).join('\n')}`);
      failed = true;
    }
  }
  if (!failed) console.log(`check-shrinking-lists: ${SHRINKING_LISTS.length} list(s) shrink or hold against ${mergeBase.slice(0, 12)}.`);
  process.exitCode = failed ? 1 : 0;
}

if (isMain(import.meta.url)) main();
