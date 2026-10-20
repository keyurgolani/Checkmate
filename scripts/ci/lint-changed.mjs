#!/usr/bin/env node
/**
 * Gate A lint (#1 gate policy): ESLint on the JavaScript and TypeScript files
 * a change touches, and a failure when the change adds a directive that turns
 * ESLint off.
 *
 *   node scripts/ci/lint-changed.mjs --base <sha> [--head <ref>]
 */

import { execFileSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { isMain, REPO_ROOT } from './lib/actions.mjs';

const LINTABLE = /\.[cm]?[jt]sx?$/;
// Assembled at runtime so this file never contains the directive it scans for.
export const DIRECTIVE = ['eslint', 'disable'].join('-');

/**
 * @param {string[]} files
 * @param {(file: string) => boolean} [exists]
 * @returns {string[]}
 */
export function lintableFiles(files, exists = (file) => fs.existsSync(path.join(REPO_ROOT, file))) {
  return files.filter((file) => LINTABLE.test(file) && exists(file));
}

/**
 * `file:line` for each added line of a unified diff that carries the directive.
 * @param {string} diff
 * @returns {string[]}
 */
export function addedDirectives(diff) {
  const found = [];
  let file = null;
  let line = 0;
  for (const text of diff.split('\n')) {
    if (text.startsWith('+++ ')) {
      file = text.slice(4).replace(/^b\//, '');
      continue;
    }
    const hunk = /^@@ -\d+(?:,\d+)? \+(\d+)(?:,\d+)? @@/.exec(text);
    if (hunk) {
      line = Number(hunk[1]);
      continue;
    }
    if (text.startsWith('+')) {
      if (file && text.includes(DIRECTIVE)) found.push(`${file}:${line}`);
      line += 1;
    } else if (text.startsWith(' ')) {
      line += 1;
    }
  }
  return found;
}

function git(args) {
  return execFileSync('git', args, { cwd: REPO_ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
}

function main() {
  const { values } = parseArgs({ options: { base: { type: 'string' }, head: { type: 'string', default: 'HEAD' } } });
  if (!values.base) {
    console.error('Usage: node scripts/ci/lint-changed.mjs --base <sha> [--head <ref>]');
    process.exitCode = 2;
    return;
  }
  const range = `${values.base}...${values.head}`;
  const files = lintableFiles(git(['diff', '--name-only', '--diff-filter=ACMR', range]).split('\n').filter(Boolean));
  if (files.length === 0) {
    console.log('lint-changed: no changed JavaScript or TypeScript files.');
    return;
  }

  console.log(`lint-changed: eslint on ${files.length} changed file(s):\n${files.map((file) => `  ${file}`).join('\n')}`);
  const eslint = spawnSync(process.execPath, [path.join(REPO_ROOT, 'node_modules/eslint/bin/eslint.js'), '--no-warn-ignored', ...files], {
    cwd: REPO_ROOT,
    stdio: 'inherit',
  });
  let failed = eslint.status !== 0;

  const directives = addedDirectives(git(['diff', '-U0', range, '--', ...files]));
  if (directives.length > 0) {
    console.error(`lint-changed: the change adds ${DIRECTIVE} at:\n${directives.map((place) => `  ${place}`).join('\n')}`);
    console.error('Fix the finding instead of turning the rule off.');
    failed = true;
  }
  if (!failed) console.log('lint-changed: clean.');
  process.exitCode = failed ? 1 : 0;
}

if (isMain(import.meta.url)) main();
