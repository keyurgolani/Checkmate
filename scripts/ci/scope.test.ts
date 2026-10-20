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

  it('runs unit, backend and images for the schema the fixture loads and the retention test reads', () => {
    expect(running(['docker/pocketbase/pb_schema.json'])).toEqual(['unit', 'backend', 'images']);
  });

  it.each([
    'docs/architecture/glossary.md',
    'docs/architecture/decisions/run.md',
    'docs/transformation/dependency-graph.md',
  ])('runs unit for %s, which a unit test checks against the data', (file) => {
    expect(classifyFile(file, config)).toEqual(['contract-docs']);
    expect(running([file, 'README.md'])).toEqual(['unit']);
  });

  it('still treats the dependency graph data as code', () => {
    expect(running(['docs/transformation/dependency-graph.json'])).toEqual(['lint', 'unit', 'backend', 'build']);
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
