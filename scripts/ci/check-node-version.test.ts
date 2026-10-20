import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { REPO_ROOT } from './lib/actions.mjs';
import { checkNodeVersion } from './check-node-version.mjs';

const FILES = ['.nvmrc', 'package.json', 'package-lock.json', 'Dockerfile', 'Dockerfile.dev', '.github/workflows/ci.yml', '.github/workflows/publish-images.yml'];

function copyRepoFiles(): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'cm-node-version-'));
  for (const file of FILES) {
    fs.mkdirSync(path.dirname(path.join(root, file)), { recursive: true });
    fs.copyFileSync(path.join(REPO_ROOT, file), path.join(root, file));
  }
  return root;
}

function edit(root: string, file: string, change: (text: string) => string) {
  const target = path.join(root, file);
  fs.writeFileSync(target, change(fs.readFileSync(target, 'utf8')));
}

describe('check-node-version', () => {
  it('passes on the repository', () => {
    expect(checkNodeVersion()).toEqual([]);
  });

  it('flags each source that drifts from .nvmrc', () => {
    const root = copyRepoFiles();
    edit(root, 'Dockerfile.dev', (text) => text.replace('FROM node:24-alpine', 'FROM node:22-alpine'));
    edit(root, 'package.json', (text) => text.replace('">=24 <25"', '">=22"'));
    edit(root, '.github/workflows/ci.yml', (text) => text.replace('node-version-file: .nvmrc', 'node-version: 22'));

    expect(checkNodeVersion(root)).toEqual([
      'package.json engines.node is ">=22", expected ">=24 <25"',
      'Dockerfile.dev uses node:22-alpine, expected node:24-alpine',
      'ci.yml: actions/setup-node must use node-version-file: .nvmrc',
    ]);
  });

  it('flags a bumped .nvmrc that nothing else follows', () => {
    const root = copyRepoFiles();
    fs.writeFileSync(path.join(root, '.nvmrc'), '26\n');
    // engines, @types/node, its lockfile entry, three FROM lines in Dockerfile, one in Dockerfile.dev
    expect(checkNodeVersion(root)).toHaveLength(7);
  });
});
