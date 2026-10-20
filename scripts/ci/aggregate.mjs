#!/usr/bin/env node
/**
 * The one required check. Fails on any failed, cancelled or wrongly skipped
 * job and writes a table with each job's result, failure class and a
 * fresh-clone repro command, or the path rule that skipped it.
 *
 * Env (from ci.yml): NEEDS = toJSON(needs), REPOSITORY, SERVER_URL, SHA, and
 * PR_NUMBER and PR_HEAD_SHA on pull requests.
 */

import { appendSummary, cell, isMain, loadScopeConfig } from './lib/actions.mjs';

/**
 * @typedef {{ job: string, result: string, pass: boolean, failureClass?: string, note?: string }} Row
 */

/**
 * One row per job in .github/ci-scope.json.
 * @param {{ needs: Record<string, any>, config: any }} input
 * @returns {{ rows: Row[], failed: Row[] }}
 */
export function judge({ needs, config }) {
  const scope = needs.scope;
  const scopeRan = scope?.result === 'success';
  const reasons = scopeRan ? JSON.parse(scope.outputs?.reasons || '{}') : {};

  const rows = Object.entries(config.jobs).map(([job, meta]) => {
    const need = needs[job];
    if (!need) return { job, result: 'missing', pass: false, failureClass: 'gate', note: 'not in the aggregate job\'s needs' };
    const expected = meta.always === true || !scopeRan || scope.outputs?.[job] === 'true';
    const recorded = need.outputs?.failure_class;

    switch (need.result) {
      case 'success':
        return { job, result: 'success', pass: true };
      case 'skipped':
        if (!expected) return { job, result: 'skipped', pass: true, note: `skipped: ${reasons[job] ?? 'not needed for this change'}` };
        return { job, result: 'skipped', pass: false, failureClass: 'infra', note: scopeRan ? 'skipped although the scope needed it' : 'skipped because scope did not finish' };
      case 'cancelled':
        return { job, result: 'cancelled', pass: false, failureClass: recorded === 'timeout' ? 'timeout' : 'cancelled' };
      case 'failure':
        // No recorded class means a setup step (checkout, Node) failed.
        return { job, result: 'failure', pass: false, failureClass: recorded || 'infra' };
      default:
        return { job, result: String(need.result), pass: false, failureClass: 'infra', note: 'unexpected result' };
    }
  });
  return { rows, failed: rows.filter((row) => !row.pass) };
}

/**
 * @param {{ job: string, config: any, env: Record<string, string | undefined>, base?: string }} input
 * @returns {string}
 */
export function reproCommand({ job, config, env, base }) {
  const repository = `${env.SERVER_URL ?? 'https://github.com'}/${env.REPOSITORY ?? 'keyurgolani/Checkmate'}.git`;
  const checkout = env.PR_NUMBER
    ? `git fetch origin pull/${env.PR_NUMBER}/head && git checkout --detach ${env.PR_HEAD_SHA}`
    : `git checkout --detach ${env.SHA}`;
  const command = config.jobs[job].repro.replaceAll('{base}', base || '<base-sha>');
  return `git clone ${repository} checkmate-ci && cd checkmate-ci && ${checkout} && npm ci && ${command}`;
}

/**
 * @param {{ rows: Row[], failed: Row[] }} verdict
 * @param {{ config: any, env: Record<string, string | undefined>, base?: string }} context
 * @returns {string} markdown
 */
export function summarize({ rows, failed }, { config, env, base }) {
  const lines = [
    failed.length === 0 ? '### aggregate: passed' : `### aggregate: failed (${failed.length} of ${rows.length} jobs)`,
    '',
    '| Job | Result | Failure class | Repro from a fresh clone, or why it skipped |',
    '| --- | --- | --- | --- |',
  ];
  for (const row of rows) {
    const detail = row.pass ? (row.note ?? '') : [row.note, `\`${reproCommand({ job: row.job, config, env, base })}\``].filter(Boolean).join(': ');
    lines.push(`| ${row.job} | ${row.result} | ${row.failureClass ?? ''} | ${cell(detail)} |`);
  }
  return lines.join('\n');
}

function main() {
  const config = loadScopeConfig();
  const needs = JSON.parse(process.env.NEEDS || '{}');
  const verdict = judge({ needs, config });
  const base = needs.scope?.outputs?.base;
  appendSummary(summarize(verdict, { config, env: process.env, base }));

  for (const row of verdict.rows) {
    const status = row.pass ? 'ok' : `FAILED (${row.failureClass})`;
    console.log(`${row.job}: ${row.result}, ${status}${row.note ? `, ${row.note}` : ''}`);
    if (!row.pass) console.log(`  repro: ${reproCommand({ job: row.job, config, env: process.env, base })}`);
  }
  if (verdict.failed.length > 0) process.exitCode = 1;
}

if (isMain(import.meta.url)) main();
