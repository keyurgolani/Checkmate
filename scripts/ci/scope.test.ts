import { describe, expect, it } from 'vitest';
import { loadScopeConfig } from './lib/actions.mjs';
import { classifyFile, planJobs } from './scope.mjs';

const config = loadScopeConfig();
const plan = (files: string[], event = 'pull_request') => planJobs({ event, files, config });
const running = (files: string[], event?: string) =>
  Object.entries(plan(files, event).run)
    .filter(([, runs]) => runs)
    .map(([job]) => job);

const EVERY_JOB = ['lint', 'unit', 'backend', 'build', 'images'];

describe('scope', () => {
  it('runs nothing for a docs-only change and says why', () => {
    const files = ['README.md', 'docs/DEPLOYMENT.md', 'docker/pocketbase/README.md'];
    expect(running(files)).toEqual([]);
    expect(plan(files).reasons.backend).toBe('no changed file is in toolchain, fixture, code (changed: 3 docs)');
  });

  it('treats JSON under docs as code', () => {
    expect(running(['docs/accessibility/lint-owners.json'])).toEqual(['lint', 'unit', 'backend', 'build']);
  });

  it('runs images for Docker files', () => {
    expect(running(['Dockerfile', 'docker/pocketbase/entrypoint.sh'])).toEqual(['images']);
  });

  it('runs lint, unit, backend and build for code', () => {
    expect(running(['src/lib/services/item.ts'])).toEqual(['lint', 'unit', 'backend', 'build']);
  });

  it('runs backend and images for the schema the fixture loads', () => {
    expect(running(['docker/pocketbase/pb_schema.json'])).toEqual(['backend', 'images']);
  });

  it.each([
    '.github/workflows/ci.yml',
    '.github/ci-scope.json',
    'package-lock.json',
    '.nvmrc',
    'vitest.config.ts',
    'scripts/ci/scope.mjs',
    'docker/pocketbase/Dockerfile',
    'docker/pocketbase/pocketbase.sha256',
  ])('treats %s as toolchain, which runs every job', (file) => {
    expect(classifyFile(file, config)).toEqual(['toolchain']);
    expect(running([file, 'README.md'])).toEqual(EVERY_JOB);
  });

  it('runs every job on a push', () => {
    expect(running([], 'push')).toEqual(EVERY_JOB);
  });
});
