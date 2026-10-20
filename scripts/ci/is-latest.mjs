#!/usr/bin/env node
/**
 * Prints `true` when a tag is the highest vX.Y.Z tag, so its image may move
 * `latest`, and `false` otherwise (an older line's patch, a pre-release or a
 * non-version tag).
 *
 *   node scripts/ci/is-latest.mjs v0.2.1     # compares with `git tag --list 'v*'`
 */

import { execFileSync } from 'node:child_process';
import { isMain, REPO_ROOT } from './lib/actions.mjs';

const RELEASE = /^v(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/;

/**
 * [major, minor, patch] for a strict vX.Y.Z tag, else null.
 * @param {string} tag
 * @returns {number[] | null}
 */
export function parseRelease(tag) {
  const match = RELEASE.exec(tag.trim());
  return match ? match.slice(1, 4).map(Number) : null;
}

function compare(a, b) {
  for (let index = 0; index < 3; index++) {
    if (a[index] !== b[index]) return a[index] - b[index];
  }
  return 0;
}

/**
 * @param {string} tag the pushed tag
 * @param {string[]} tags every tag in the repository
 * @returns {boolean}
 */
export function isLatest(tag, tags) {
  const version = parseRelease(tag);
  if (!version) return false;
  return tags.map(parseRelease).every((other) => other === null || compare(version, other) >= 0);
}

function main() {
  const tag = process.argv[2];
  if (!tag) {
    console.error('Usage: node scripts/ci/is-latest.mjs <tag>');
    process.exitCode = 2;
    return;
  }
  const tags = execFileSync('git', ['tag', '--list', 'v*'], { cwd: REPO_ROOT, encoding: 'utf8' }).split('\n');
  console.log(String(isLatest(tag, tags)));
}

if (isMain(import.meta.url)) main();
