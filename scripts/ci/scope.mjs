#!/usr/bin/env node
/**
 * Decides which ci.yml jobs a change needs, from .github/ci-scope.json.
 *
 *   node scripts/ci/scope.mjs --event pull_request --base <sha> [--head <ref>]
 *   node scripts/ci/scope.mjs --event push [--before <sha>]
 *
 * Pull requests run the union of their changed files' classes; every other
 * event runs every job. Writes `<job>=true|false`, `base` (for lint) and
 * `reasons` (why each skipped job skipped) to $GITHUB_OUTPUT.
 */

import { execFileSync } from 'node:child_process';
import { parseArgs } from 'node:util';
import { appendSummary, cell, isMain, loadScopeConfig, REPO_ROOT, setOutputs } from './lib/actions.mjs';
import { matchesGlob } from './lib/glob.mjs';

const ZERO_SHA = /^0+$/;

export function scopedJobs(config) {
  return Object.keys(config.jobs).filter((job) => !config.jobs[job].always);
}

function classJobs(cls, config) {
  return cls.jobs === 'all' ? scopedJobs(config) : cls.jobs;
}

function matches(file, cls) {
  return cls.paths.some((pattern) => matchesGlob(file, pattern)) && !(cls.except ?? []).some((pattern) => matchesGlob(file, pattern));
}

/**
 * The classes a file belongs to.
 * @param {string} file
 * @param {any} config
 * @returns {string[]}
 */
export function classifyFile(file, config) {
  const matched = [];
  for (const cls of config.classes) {
    if (!matches(file, cls)) continue;
    if (cls.exclusive) return [cls.name];
    matched.push(cls.name);
  }
  return matched.length > 0 ? matched : [config.default.name];
}

/**
 * Plans the jobs for an event. Returns which scoped jobs run, the changed
 * files per class, and for each skipped job the rule that skipped it.
 * @param {{ event: string, files: string[], config: any }} input
 * @returns {{ run: Record<string, boolean>, byClass: Record<string, string[]>, reasons: Record<string, string> }}
 */
export function planJobs({ event, files, config }) {
  const jobs = scopedJobs(config);
  if (event !== 'pull_request') {
    return { run: Object.fromEntries(jobs.map((job) => [job, true])), byClass: {}, reasons: {} };
  }

  const classes = [...config.classes, config.default];
  const byClass = {};
  for (const file of files) {
    for (const name of classifyFile(file, config)) (byClass[name] ??= []).push(file);
  }
  const enabled = new Set(
    Object.keys(byClass).flatMap((name) => classJobs(classes.find((cls) => cls.name === name), config)),
  );

  const run = Object.fromEntries(jobs.map((job) => [job, enabled.has(job)]));
  const counts = Object.entries(byClass)
    .map(([name, list]) => `${list.length} ${name}`)
    .join(', ');
  const reasons = {};
  for (const job of jobs.filter((candidate) => !run[candidate])) {
    const triggers = classes.filter((cls) => classJobs(cls, config).includes(job)).map((cls) => cls.name);
    reasons[job] = `no changed file is in ${triggers.join(', ')} (changed: ${counts || 'none'})`;
  }
  return { run, byClass, reasons };
}

function git(args) {
  return execFileSync('git', args, { cwd: REPO_ROOT, encoding: 'utf8' }).trim();
}

function commitExists(sha) {
  try {
    git(['cat-file', '-e', `${sha}^{commit}`]);
    return true;
  } catch {
    return false;
  }
}

/** The commit lint compares against: the PR base, or what a push replaced. */
export function resolveBase({ event, base, before, head }) {
  if (event === 'pull_request') {
    if (!base) throw new Error('scope: --base is required for pull_request events');
    return base;
  }
  if (before && !ZERO_SHA.test(before) && commitExists(before)) return before;
  return commitExists(`${head}~1`) ? git(['rev-parse', `${head}~1`]) : '';
}

export function changedFiles(base, head) {
  if (!base) return git(['ls-tree', '-r', '--name-only', head]).split('\n').filter(Boolean);
  return git(['diff', '--name-only', `${base}...${head}`]).split('\n').filter(Boolean);
}

function main() {
  const { values } = parseArgs({
    options: {
      event: { type: 'string', default: process.env.GITHUB_EVENT_NAME ?? 'pull_request' },
      base: { type: 'string' },
      before: { type: 'string' },
      head: { type: 'string', default: 'HEAD' },
    },
  });
  const config = loadScopeConfig();
  const base = resolveBase(values);
  const files = values.event === 'pull_request' ? changedFiles(base, values.head) : [];
  const plan = planJobs({ event: values.event, files, config });

  setOutputs({
    ...Object.fromEntries(Object.entries(plan.run).map(([job, runs]) => [job, String(runs)])),
    base,
    reasons: JSON.stringify(plan.reasons),
  });

  const lines = [`### scope`, '', values.event === 'pull_request' ? `${files.length} changed file(s) against \`${base.slice(0, 12)}\`.` : `\`${values.event}\` runs every job.`, ''];
  if (Object.keys(plan.byClass).length > 0) {
    lines.push('| Class | Files |', '| --- | --- |');
    for (const [name, list] of Object.entries(plan.byClass)) lines.push(`| ${name} | ${cell(list.slice(0, 20).join(', '))}${list.length > 20 ? ` and ${list.length - 20} more` : ''} |`);
    lines.push('');
  }
  lines.push('| Job | Runs | Why not |', '| --- | --- | --- |');
  for (const [job, runs] of Object.entries(plan.run)) lines.push(`| ${job} | ${runs ? 'yes' : 'no'} | ${cell(plan.reasons[job] ?? '')} |`);
  appendSummary(lines.join('\n'));

  for (const [job, runs] of Object.entries(plan.run)) console.log(`${job}: ${runs ? 'runs' : `skipped, ${plan.reasons[job]}`}`);
}

if (isMain(import.meta.url)) main();
