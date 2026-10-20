import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { failureClass, formatDuration, runStep } from './step.mjs';

function actionsEnv() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cm-step-test-'));
  return { ...process.env, GITHUB_OUTPUT: path.join(dir, 'output'), GITHUB_STEP_SUMMARY: path.join(dir, 'summary') };
}

const read = (file: string | undefined) => (file && fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '');

describe('step', () => {
  it.each([
    'FIXTURE_DOWNLOAD_FAILED: GET https://github.com/... failed',
    'Failed to fetch `Inter` from Google Fonts.',
    'npm error code ECONNRESET',
    'ERROR: failed to resolve source metadata for docker.io/library/node:24-alpine',
  ])('classifies "%s" as infra', (output) => {
    expect(failureClass({ output, timedOut: false, fallback: 'test' })).toBe('infra');
  });

  it('keeps the job class for ordinary failures, and reports timeouts', () => {
    expect(failureClass({ output: 'AssertionError: expected 1 to be 2', timedOut: false, fallback: 'test' })).toBe('test');
    expect(failureClass({ output: '', timedOut: true, fallback: 'test' })).toBe('timeout');
  });

  it('formats durations', () => {
    expect(formatDuration(4_200)).toBe('4s');
    expect(formatDuration(62_000)).toBe('1m 02s');
  });

  it('records a failed step with its class', async () => {
    const env = actionsEnv();
    const code = await runStep({ name: 'planted failure', fallbackClass: 'test', command: process.execPath, args: ['-e', 'process.exit(3)'], env });
    expect(code).toBe(3);
    expect(read(env.GITHUB_OUTPUT)).toMatch(/^failure_class<<ghadelimiter_[\w-]+\ntest\nghadelimiter_[\w-]+\n$/);
    expect(read(env.GITHUB_STEP_SUMMARY)).toMatch(/^- \*\*planted failure\*\*: failed \(test\) in \d+s\n$/);
  });

  it('stops a step at its timeout', async () => {
    const env = actionsEnv();
    const code = await runStep({ name: 'hang', fallbackClass: 'test', timeoutMs: 300, command: process.execPath, args: ['-e', 'setTimeout(() => {}, 60000)'], env });
    expect(code).not.toBe(0);
    expect(read(env.GITHUB_OUTPUT)).toContain('\ntimeout\n');
  });

  it('records a passing step without a failure class', async () => {
    const env = actionsEnv();
    expect(await runStep({ name: 'ok', fallbackClass: 'test', command: process.execPath, args: ['-e', ''], env })).toBe(0);
    expect(read(env.GITHUB_OUTPUT)).toBe('');
    expect(read(env.GITHUB_STEP_SUMMARY)).toMatch(/^- \*\*ok\*\*: passed in \d+s\n$/);
  });
});
