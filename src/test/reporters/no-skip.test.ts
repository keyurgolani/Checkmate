import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { REPO_ROOT } from '../fixture/binary';
import { isCi } from './no-skip';

const vitest = path.join(REPO_ROOT, 'node_modules/vitest/vitest.mjs');
const reporter = path.join(REPO_ROOT, 'src/test/reporters/no-skip.ts');

/** Runs a one-file suite in a nested vitest with this reporter. */
function runSuite(body: string, ci: string) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cm-no-skip-'));
  try {
    fs.writeFileSync(path.join(dir, 'sample.test.js'), body);
    const config = path.join(dir, 'vitest.config.mjs');
    fs.writeFileSync(config, `export default { test: { globals: true, include: ['sample.test.js'], reporters: ['default', ${JSON.stringify(reporter)}] } };\n`);
    const env: NodeJS.ProcessEnv = { ...process.env, CI: ci };
    for (const name of Object.keys(env)) if (name.startsWith('VITEST')) delete env[name];
    const result = spawnSync(process.execPath, [vitest, '--run', '--root', dir, '--config', config], { encoding: 'utf8', env });
    return { status: result.status, output: `${result.stdout}${result.stderr}` };
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

describe('no-skip reporter', () => {
  it('fails a CI run that skips a test or leaves a todo', () => {
    const { status, output } = runSuite("it('runs', () => {});\nit.skip('skipped', () => {});\nit.todo('later');\n", 'true');
    expect(status).toBe(1);
    expect(output).toContain('no-skip: CI allows no skipped or todo tests, found 2');
    expect(output).toContain('sample.test.js > later (todo)');
  });

  it('only warns outside CI', () => {
    const { status, output } = runSuite("it('runs', () => {});\nit.skip('skipped', () => {});\n", '');
    expect(status).toBe(0);
    expect(output).toContain('no-skip: 1 skipped or todo test(s); CI fails on these');
  });

  it('accepts expected failures, which still run', () => {
    const { status } = runSuite("it('runs', () => {});\nit.fails('known defect', () => { throw new Error('defect'); });\n", 'true');
    expect(status).toBe(0);
  });

  it.each([
    ['true', true],
    ['1', true],
    ['', false],
    ['false', false],
    [undefined, false],
  ])('reads CI=%s as %s', (value, expected) => {
    expect(isCi({ CI: value })).toBe(expected);
  });
});
