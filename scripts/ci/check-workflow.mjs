#!/usr/bin/env node
/**
 * Enforces the CI security and gate rules on .github/workflows:
 *
 * - Only ci.yml's `publish` job and the job it calls read secrets or get
 *   write permissions; every workflow's top-level token is read-only.
 * - The called job declares `environment: release`.
 * - `publish` needs `aggregate`, passes secrets by name, and its `if:` runs
 *   exactly for a v* tag push, or a push to next with PUBLISH_FROM_NEXT
 *   'true', after a green aggregate. The condition is checked by evaluating
 *   it over events, refs, variable values and results, not by its text.
 * - ci.yml runs on pull_request and push (main, next, v* tags) with no path
 *   filters, `aggregate` runs with `if: always()` and needs every other job,
 *   and .github/ci-scope.json describes exactly those jobs.
 * - Every remote `uses:` pins a full commit SHA (docker:// pins a digest).
 */

import fs from 'node:fs';
import path from 'node:path';
import yaml from 'js-yaml';
import { isMain, loadScopeConfig, REPO_ROOT } from './lib/actions.mjs';
import { evaluateJobIf, unwrap } from './lib/expression.mjs';

export const CI_WORKFLOW = 'ci.yml';
export const PUBLISH_JOB = 'publish';
export const AGGREGATE_JOB = 'aggregate';
export const PUBLISH_WORKFLOW_REF = './.github/workflows/publish-images.yml';

const PINNED_ACTION = /^[\w.-]+\/[\w.-]+(\/[^@\s]+)?@[0-9a-f]{40}$/;
const PINNED_IMAGE = /^docker:\/\/[^@\s]+@sha256:[0-9a-f]{64}$/;
const DANGEROUS_TRIGGERS = ['pull_request_target', 'workflow_run'];
const PATH_FILTERS = ['paths', 'paths-ignore', 'branches-ignore', 'tags-ignore'];

const EVENTS = ['push', 'pull_request', 'pull_request_target', 'workflow_dispatch', 'schedule', 'merge_group', 'release', 'workflow_run'];
const REFS = [
  'refs/heads/main',
  'refs/heads/next',
  'refs/heads/next-preview',
  'refs/heads/release/v0.2',
  'refs/heads/vnext',
  'refs/tags/v0.2.0',
  'refs/tags/v1.10.3',
  'refs/tags/v0.3.0-rc.1',
  'refs/tags/baseline-0.1.0',
  'refs/pull/7/merge',
];
const PUBLISH_FROM_NEXT = [undefined, '', 'false', 'true', 'TRUE', '1'];
const RESULTS = ['success', 'failure', 'cancelled', 'skipped'];

/**
 * The publishing policy: nothing publishes from main or a pull request, and
 * next publishes only while the owner sets PUBLISH_FROM_NEXT to 'true'.
 * @param {{ event: string, ref: string, publishFromNext?: string, aggregate: string, cancelled: boolean }} scenario
 * @returns {boolean}
 */
export function publishPolicy({ event, ref, publishFromNext, aggregate, cancelled }) {
  if (cancelled || aggregate !== 'success' || event !== 'push') return false;
  if (ref.startsWith('refs/tags/v')) return true;
  return ref === 'refs/heads/next' && String(publishFromNext ?? '').toLowerCase() === 'true';
}

function* scenarios() {
  for (const event of EVENTS)
    for (const ref of REFS)
      for (const publishFromNext of PUBLISH_FROM_NEXT)
        for (const aggregate of RESULTS)
          for (const cancelled of [false, true]) yield { event, ref, publishFromNext, aggregate, cancelled };
}

function context(scenario) {
  const tag = scenario.ref.startsWith('refs/tags/');
  return {
    github: {
      event_name: scenario.event,
      ref: scenario.ref,
      ref_name: scenario.ref.replace(/^refs\/(heads|tags|pull)\//, ''),
      ref_type: tag ? 'tag' : 'branch',
      event: scenario.event.startsWith('pull_request') ? { pull_request: { number: 7 } } : {},
    },
    vars: scenario.publishFromNext === undefined ? {} : { PUBLISH_FROM_NEXT: scenario.publishFromNext },
    needs: { [AGGREGATE_JOB]: { result: scenario.aggregate } },
    status: {
      success: () => !scenario.cancelled && scenario.aggregate === 'success',
      failure: () => !scenario.cancelled && scenario.aggregate === 'failure',
      cancelled: () => scenario.cancelled,
      always: () => true,
    },
  };
}

function describeScenario(scenario) {
  const variable = scenario.publishFromNext === undefined ? 'unset' : `'${scenario.publishFromNext}'`;
  return `a ${scenario.event} of ${scenario.ref} with PUBLISH_FROM_NEXT ${variable} and aggregate ${scenario.aggregate}${scenario.cancelled ? ' in a cancelled run' : ''}`;
}

/**
 * Checks a job `if:` against the policy. With `implied`, the condition may
 * be stricter than the policy (a guard inside the called workflow) but never
 * looser. Returns a problem description, or null.
 * @param {unknown} condition
 * @param {{ implied?: boolean }} [options]
 * @returns {string | null}
 */
export function checkPublishCondition(condition, { implied = false } = {}) {
  if (condition === undefined || condition === null) return 'has no if: condition';
  for (const scenario of scenarios()) {
    if (implied && (scenario.aggregate !== 'success' || scenario.cancelled)) continue;
    let runs;
    try {
      runs = evaluateJobIf(condition, context(scenario));
    } catch (error) {
      return `has an if: condition this check can't evaluate (${error.message})`;
    }
    const allowed = publishPolicy(scenario);
    if (implied ? runs && !allowed : runs !== allowed) {
      return `${runs ? 'runs' : 'skips'} on ${describeScenario(scenario)}, where it must ${allowed ? 'run' : 'skip'}`;
    }
  }
  return null;
}

function list(value) {
  if (value === undefined || value === null) return [];
  return Array.isArray(value) ? value : [value];
}

function triggers(workflow) {
  const on = workflow?.on;
  if (typeof on === 'string') return { [on]: null };
  if (Array.isArray(on)) return Object.fromEntries(on.map((event) => [event, null]));
  return on ?? {};
}

function grantsWrite(permissions) {
  if (permissions === undefined || permissions === null) return false;
  if (typeof permissions === 'string') return permissions === 'write-all';
  return Object.values(permissions).includes('write');
}

function readsSecrets(value) {
  return /\bsecrets\s*(\.|\[)|\bgithub\.token\b/.test(JSON.stringify(value ?? null));
}

function usesOf(workflow) {
  return Object.values(workflow?.jobs ?? {}).flatMap((job) => [job?.uses, ...list(job?.steps).map((step) => step?.uses)].filter(Boolean));
}

/**
 * @param {{ workflows: Record<string, any>, actions?: Record<string, any>, scopeConfig: any }} input
 *   Parsed workflow files by file name, composite actions by path, and .github/ci-scope.json.
 * @returns {string[]} problems
 */
export function checkWorkflows({ workflows, actions = {}, scopeConfig }) {
  const problems = [];
  const ci = workflows[CI_WORKFLOW];
  if (!ci) return [`${CI_WORKFLOW} is missing`];
  const jobs = ci.jobs ?? {};
  const publish = jobs[PUBLISH_JOB];
  const calledFile = publish?.uses === PUBLISH_WORKFLOW_REF ? path.posix.basename(PUBLISH_WORKFLOW_REF) : undefined;
  const called = calledFile ? workflows[calledFile] : undefined;

  // Triggers.
  const on = triggers(ci);
  for (const event of Object.keys(on)) {
    if (event !== 'pull_request' && event !== 'push') problems.push(`${CI_WORKFLOW}: the ${event} trigger is not allowed; ci.yml runs on pull_request and push only`);
    for (const filter of PATH_FILTERS) {
      if (on[event] && typeof on[event] === 'object' && filter in on[event]) {
        problems.push(`${CI_WORKFLOW}: on.${event}.${filter} would leave the aggregate check pending; scope.mjs classifies paths instead`);
      }
    }
  }
  const branches = (event) => list(on[event]?.branches);
  if (!('pull_request' in on) || !['main', 'next'].every((branch) => branches('pull_request').includes(branch))) {
    problems.push(`${CI_WORKFLOW} must run on pull_request to main and next`);
  }
  if (!('push' in on) || !['main', 'next'].every((branch) => branches('push').includes(branch)) || !list(on.push?.tags).includes('v*')) {
    problems.push(`${CI_WORKFLOW} must run on push to main and next and on v* tags`);
  }

  // Tokens and secrets.
  const mayPublish = new Set([`${CI_WORKFLOW}#${PUBLISH_JOB}`, ...Object.keys(called?.jobs ?? {}).map((id) => `${calledFile}#${id}`)]);
  for (const [file, workflow] of Object.entries(workflows)) {
    for (const event of DANGEROUS_TRIGGERS) {
      if (event in triggers(workflow)) problems.push(`${file}: the ${event} trigger is not allowed`);
    }
    if (workflow?.permissions === undefined) problems.push(`${file}: set top-level permissions, read-only`);
    else if (grantsWrite(workflow.permissions)) problems.push(`${file}: top-level permissions must be read-only`);
    if (readsSecrets(workflow?.env) || readsSecrets(workflow?.defaults)) problems.push(`${file}: workflow-level env must not read secrets`);

    for (const [id, job] of Object.entries(workflow?.jobs ?? {})) {
      const secrets = readsSecrets(job) || job?.secrets !== undefined;
      const writes = grantsWrite(job?.permissions);
      if ((secrets || writes) && !mayPublish.has(`${file}#${id}`)) {
        const what = [secrets && 'reads secrets', writes && 'has write permissions'].filter(Boolean).join(' and ');
        problems.push(`${file}: job ${id} ${what}; only ci.yml's publish job and the job it calls may`);
      }
    }
  }

  // Publishing.
  if (!publish) {
    problems.push(`${CI_WORKFLOW} has no ${PUBLISH_JOB} job`);
  } else {
    if (publish.uses !== PUBLISH_WORKFLOW_REF) problems.push(`${CI_WORKFLOW}: ${PUBLISH_JOB} must call ${PUBLISH_WORKFLOW_REF}`);
    if (!list(publish.needs).includes(AGGREGATE_JOB)) problems.push(`${CI_WORKFLOW}: ${PUBLISH_JOB} must need ${AGGREGATE_JOB}`);
    if (publish.secrets === 'inherit') problems.push(`${CI_WORKFLOW}: ${PUBLISH_JOB} must pass secrets by name, not inherit them`);
    const problem = checkPublishCondition(publish.if);
    if (problem) problems.push(`${CI_WORKFLOW}: ${PUBLISH_JOB} ${problem}`);
  }
  if (calledFile && !called) problems.push(`${PUBLISH_WORKFLOW_REF} is missing`);
  if (called) {
    const events = Object.keys(triggers(called));
    if (events.length !== 1 || events[0] !== 'workflow_call') problems.push(`${calledFile} must trigger only on workflow_call`);
    for (const [id, job] of Object.entries(called.jobs ?? {})) {
      const environment = typeof job?.environment === 'string' ? job.environment : job?.environment?.name;
      if (environment !== 'release') problems.push(`${calledFile}: job ${id} must declare environment: release`);
      if (job?.if !== undefined) {
        const problem = checkPublishCondition(job.if, { implied: true });
        if (problem) problems.push(`${calledFile}: job ${id} ${problem}`);
      }
    }
  }

  // The aggregate check and its scope table.
  const aggregate = jobs[AGGREGATE_JOB];
  const gated = Object.keys(jobs).filter((id) => id !== AGGREGATE_JOB && id !== PUBLISH_JOB);
  if (!aggregate) {
    problems.push(`${CI_WORKFLOW} has no ${AGGREGATE_JOB} job`);
  } else {
    if (unwrap(String(aggregate.if ?? '')).replace(/\s+/g, '') !== 'always()') problems.push(`${CI_WORKFLOW}: ${AGGREGATE_JOB} must run with if: always()`);
    const needs = new Set(list(aggregate.needs));
    for (const id of gated) if (!needs.has(id)) problems.push(`${CI_WORKFLOW}: ${AGGREGATE_JOB} must need ${id}`);
  }
  for (const id of gated) if (!scopeConfig.jobs?.[id]) problems.push(`.github/ci-scope.json has no entry for the ${id} job`);
  for (const id of Object.keys(scopeConfig.jobs ?? {})) if (!jobs[id]) problems.push(`.github/ci-scope.json lists ${id}, which ${CI_WORKFLOW} lacks`);

  // Pinning.
  const references = [
    ...Object.entries(workflows).flatMap(([file, workflow]) => usesOf(workflow).map((ref) => [file, ref])),
    ...Object.entries(actions).flatMap(([file, action]) => list(action?.runs?.steps).map((step) => [file, step?.uses]).filter(([, ref]) => ref)),
  ];
  for (const [file, ref] of references) {
    if (ref.startsWith('./')) continue;
    if (ref.startsWith('docker://')) {
      if (!PINNED_IMAGE.test(ref)) problems.push(`${file}: ${ref} must pin an image digest (@sha256:...)`);
    } else if (!PINNED_ACTION.test(ref)) {
      problems.push(`${file}: ${ref} must pin a full commit SHA`);
    }
  }

  return problems;
}

/** @returns {Record<string, any>} parsed YAML by path relative to `dir` */
function loadYamlFiles(dir, match) {
  if (!fs.existsSync(dir)) return {};
  /** @type {Record<string, any>} */
  const found = {};
  for (const entry of fs.readdirSync(dir, { recursive: true })) {
    const relative = String(entry);
    if (match(relative)) found[relative] = yaml.load(fs.readFileSync(path.join(dir, relative), 'utf8'));
  }
  return found;
}

/**
 * Parsed workflows, composite actions and scope config of a checkout.
 * @returns {{ workflows: Record<string, any>, actions: Record<string, any>, scopeConfig: any }}
 */
export function loadWorkflowTree(root = REPO_ROOT) {
  return {
    workflows: loadYamlFiles(path.join(root, '.github/workflows'), (file) => /^[^/]+\.ya?ml$/.test(file)),
    actions: loadYamlFiles(path.join(root, '.github/actions'), (file) => /(^|\/)action\.ya?ml$/.test(file)),
    scopeConfig: loadScopeConfig(path.join(root, '.github/ci-scope.json')),
  };
}

function main() {
  const tree = loadWorkflowTree(process.argv[2] ? path.resolve(process.argv[2]) : REPO_ROOT);
  const problems = checkWorkflows(tree);
  if (problems.length === 0) {
    console.log(`check-workflow: ${Object.keys(tree.workflows).length} workflow(s) pass.`);
    return;
  }
  for (const problem of problems) console.error(`check-workflow: ${problem}`);
  process.exitCode = 1;
}

if (isMain(import.meta.url)) main();
