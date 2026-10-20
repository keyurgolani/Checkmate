import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { REPO_ROOT } from './lib/actions.mjs';
import { checkNodeVersion } from './check-node-version.mjs';

const FILES = ['.nvmrc', 'package.json', 'package-lock.json', 'Dockerfile', 'Dockerfile.dev', '.github/workflows/ci.yml', '.github/workflows/publish-images.yml'];

// Read from .nvmrc, so these tests still pass after a move to another major.
const major = Number(fs.readFileSync(path.join(REPO_ROOT, '.nvmrc'), 'utf8').trim());
const engines = `">=${major} <${major + 1}"`;
const other = major - 2;

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
    edit(root, 'Dockerfile.dev', (text) => text.replace(`FROM node:${major}-alpine`, `FROM node:${other}-alpine`));
    edit(root, 'package.json', (text) => text.replace(engines, `">=${other}"`));
    edit(root, '.github/workflows/ci.yml', (text) => text.replace('node-version-file: .nvmrc', `node-version: ${other}`));

    expect(checkNodeVersion(root)).toEqual([
      `package.json engines.node is ">=${other}", expected ${engines}`,
      `Dockerfile.dev uses node:${other}-alpine, expected node:${major}-alpine`,
      'ci.yml: actions/setup-node must use node-version-file: .nvmrc',
    ]);
  });

  it('flags a bumped .nvmrc that nothing else follows', () => {
    const root = copyRepoFiles();
    fs.writeFileSync(path.join(root, '.nvmrc'), `${major + 2}\n`);
    // engines, @types/node, its lockfile entry, three FROM lines in Dockerfile, one in Dockerfile.dev
    expect(checkNodeVersion(root)).toHaveLength(7);
  });
});
