import { describe, expect, it } from 'vitest';
import { judge, reproCommand, summarize } from './aggregate.mjs';
import { loadScopeConfig } from './lib/actions.mjs';

const config = loadScopeConfig();
const SCOPED = ['lint', 'unit', 'backend', 'build', 'images'];

type Need = { result: string; outputs: Record<string, string> };

/** Every job green and needed, with `overrides` applied. */
function needs(overrides: Record<string, Need> = {}): Record<string, Need> {
  const all: Record<string, Need> = {
    scope: { result: 'success', outputs: { ...Object.fromEntries(SCOPED.map((job) => [job, 'true'])), base: 'b45e', reasons: '{}' } },
    checks: { result: 'success', outputs: {} },
    ...Object.fromEntries(SCOPED.map((job) => [job, { result: 'success', outputs: {} }])),
  };
  return { ...all, ...overrides };
}

const verdict = (overrides?: Record<string, Need>, event = 'pull_request') => judge({ needs: needs(overrides), config, event });
const allSkipped = Object.fromEntries(SCOPED.map((job) => [job, { result: 'skipped', outputs: {} }]));
const row = (result: ReturnType<typeof judge>, job: string) => result.rows.find((candidate: { job: string }) => candidate.job === job);

describe('aggregate', () => {
  it('passes when every job succeeds', () => {
    expect(verdict().failed).toEqual([]);
  });

  it('passes a job the scope skipped and cites the rule', () => {
    const reasons = { images: 'no changed file is in toolchain, docker (changed: 2 code)' };
    const result = verdict({
      scope: { result: 'success', outputs: { ...needs().scope!.outputs, images: 'false', reasons: JSON.stringify(reasons) } },
      images: { result: 'skipped', outputs: {} },
    });
    expect(result.failed).toEqual([]);
    expect(row(result, 'images')?.note).toBe(`skipped: ${reasons.images}`);
  });

  it('fails a job that skipped although the scope needed it', () => {
    const result = verdict({ unit: { result: 'skipped', outputs: {} } });
    expect(row(result, 'unit')).toMatchObject({ pass: false, failureClass: 'infra', note: 'skipped although the scope needed it' });
  });

  it('fails with the class the step recorded, or infra when setup failed', () => {
    const result = verdict({
      backend: { result: 'failure', outputs: { failure_class: 'test' } },
      build: { result: 'failure', outputs: {} },
    });
    expect(row(result, 'backend')).toMatchObject({ pass: false, failureClass: 'test' });
    expect(row(result, 'build')).toMatchObject({ pass: false, failureClass: 'infra' });
  });

  it('fails cancelled jobs, as timeout when the step ran out of time', () => {
    const result = verdict({
      lint: { result: 'cancelled', outputs: {} },
      unit: { result: 'cancelled', outputs: { failure_class: 'timeout' } },
    });
    expect(row(result, 'lint')).toMatchObject({ pass: false, failureClass: 'cancelled' });
    expect(row(result, 'unit')).toMatchObject({ pass: false, failureClass: 'timeout' });
  });

  it('fails every scoped job when scope succeeds without outputs', () => {
    // As after renaming the step id that scope's outputs read.
    const result = verdict({ scope: { result: 'success', outputs: {} }, ...allSkipped });
    expect(result.failed.map((failed) => failed.job)).toEqual(SCOPED);
    expect(row(result, 'backend')?.note).toBe('skipped, and scope gave no answer for it');
  });

  it('needs every job on a push, whatever scope says', () => {
    const noJobs = Object.fromEntries(SCOPED.map((job) => [job, 'false']));
    const result = verdict({ scope: { result: 'success', outputs: { ...noJobs, base: 'b45e', reasons: '{}' } }, ...allSkipped }, 'push');
    expect(result.failed.map((failed) => failed.job)).toEqual(SCOPED);
    expect(row(result, 'images')?.note).toBe('skipped on a push run, which must run every job');
  });

  it('expects every job when scope did not finish', () => {
    const result = verdict({
      scope: { result: 'failure', outputs: { failure_class: 'infra' } },
      ...Object.fromEntries(SCOPED.map((job) => [job, { result: 'skipped', outputs: {} }])),
    });
    expect(result.failed.map((failed: { job: string }) => failed.job)).toEqual(['scope', ...SCOPED]);
  });

  it('fails when a job is missing from needs', () => {
    const all = needs();
    delete all.backend;
    expect(row(judge({ needs: all, config, event: 'pull_request' }), 'backend')).toMatchObject({ pass: false, failureClass: 'gate' });
  });

  it('gives a fresh-clone repro command for pull requests and pushes', () => {
    const pr = { SERVER_URL: 'https://github.com', REPOSITORY: 'keyurgolani/Checkmate', PR_NUMBER: '7', PR_HEAD_SHA: 'c0ffee' };
    expect(reproCommand({ job: 'backend', config, env: pr, base: 'b45e' })).toBe(
      'git clone https://github.com/keyurgolani/Checkmate.git checkmate-ci && cd checkmate-ci && git fetch origin pull/7/head && git checkout --detach c0ffee && npm ci && npm run test:backend',
    );
    expect(reproCommand({ job: 'lint', config, env: { REPOSITORY: 'keyurgolani/Checkmate', SHA: 'feed' }, base: 'b45e' })).toBe(
      'git clone https://github.com/keyurgolani/Checkmate.git checkmate-ci && cd checkmate-ci && git checkout --detach feed && npm ci && node scripts/ci/lint-changed.mjs --base b45e',
    );
  });

  it('summarizes each failing job with its class and repro command', () => {
    const result = verdict({ backend: { result: 'failure', outputs: { failure_class: 'test' } } });
    const text = summarize(result, { config, env: { REPOSITORY: 'keyurgolani/Checkmate', SHA: 'feed' }, base: 'b45e' });
    expect(text).toContain('### aggregate: failed (1 of 7 jobs)');
    expect(text).toContain('| backend | failure | test | `git clone https://github.com/keyurgolani/Checkmate.git checkmate-ci');
    expect(text).toContain('npm run test:backend`');
  });
});
