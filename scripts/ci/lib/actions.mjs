/**
 * Small helpers for scripts that run inside GitHub Actions and locally.
 */

import { randomUUID } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

export const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');

/** True when the module at `moduleUrl` is the script node was started with. */
export function isMain(moduleUrl) {
  return Boolean(process.argv[1]) && pathToFileURL(path.resolve(process.argv[1])).href === moduleUrl;
}

/** Writes step outputs to $GITHUB_OUTPUT; a no-op outside Actions. */
export function setOutputs(outputs, env = process.env) {
  if (!env.GITHUB_OUTPUT) return;
  const lines = Object.entries(outputs).map(([name, value]) => {
    const delimiter = `ghadelimiter_${randomUUID()}`;
    return `${name}<<${delimiter}\n${value}\n${delimiter}\n`;
  });
  fs.appendFileSync(env.GITHUB_OUTPUT, lines.join(''));
}

/** Appends markdown to the job summary; a no-op outside Actions. */
export function appendSummary(markdown, env = process.env) {
  if (!env.GITHUB_STEP_SUMMARY) return;
  fs.appendFileSync(env.GITHUB_STEP_SUMMARY, `${markdown}\n`);
}

export function loadScopeConfig(file = path.join(REPO_ROOT, '.github/ci-scope.json')) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

/** Escapes text for a markdown table cell. */
export function cell(value) {
  return String(value).replaceAll('|', '\\|').replaceAll('\n', ' ');
}
