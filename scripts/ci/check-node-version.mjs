#!/usr/bin/env node
/**
 * Fails when the Node major differs between .nvmrc, package.json
 * engines.node (">=N <N+1"), @types/node ("^N") and its lockfile entry,
 * every `FROM node:` in Dockerfile and Dockerfile.dev ("N-alpine"), and
 * when a workflow sets up Node without `node-version-file: .nvmrc`.
 */

import fs from 'node:fs';
import path from 'node:path';
import yaml from 'js-yaml';
import { isMain, REPO_ROOT } from './lib/actions.mjs';

const DOCKERFILES = ['Dockerfile', 'Dockerfile.dev'];

function read(root, file) {
  return fs.readFileSync(path.join(root, file), 'utf8');
}

function steps(workflow) {
  return Object.values(workflow?.jobs ?? {}).flatMap((job) => job?.steps ?? []);
}

export function checkNodeVersion(root = REPO_ROOT) {
  const problems = [];
  const nvmrc = read(root, '.nvmrc').trim();
  const major = /^v?(\d+)(\.\d+){0,2}$/.exec(nvmrc)?.[1];
  if (!major) return [`.nvmrc must hold a Node version, found "${nvmrc}"`];
  const next = String(Number(major) + 1);

  const pkg = JSON.parse(read(root, 'package.json'));
  const engines = pkg.engines?.node?.replace(/\s+/g, ' ').trim();
  if (engines !== `>=${major} <${next}`) problems.push(`package.json engines.node is "${pkg.engines?.node}", expected ">=${major} <${next}"`);

  const types = pkg.devDependencies?.['@types/node'];
  if (!new RegExp(`^\\^${major}(\\.|$)`).test(types ?? '')) problems.push(`package.json @types/node is "${types}", expected "^${major}"`);

  const lock = JSON.parse(read(root, 'package-lock.json'));
  const locked = lock.packages?.['node_modules/@types/node']?.version;
  if (locked?.split('.')[0] !== major) problems.push(`package-lock.json has @types/node ${locked}, expected ${major}.x (run npm install)`);

  for (const file of DOCKERFILES) {
    const images = [...read(root, file).matchAll(/^FROM\s+(node:\S+)/gim)].map((match) => match[1]);
    if (images.length === 0) problems.push(`${file} has no FROM node: line`);
    for (const image of images) {
      if (!new RegExp(`^node:${major}(\\.\\d+){0,2}-alpine(@sha256:[0-9a-f]{64})?$`).test(image)) {
        problems.push(`${file} uses ${image}, expected node:${major}-alpine`);
      }
    }
  }

  const workflowsDir = path.join(root, '.github/workflows');
  for (const file of fs.existsSync(workflowsDir) ? fs.readdirSync(workflowsDir) : []) {
    if (!/\.ya?ml$/.test(file)) continue;
    for (const step of steps(yaml.load(read(root, `.github/workflows/${file}`)))) {
      if (!String(step?.uses ?? '').startsWith('actions/setup-node@')) continue;
      if (step.with?.['node-version-file'] !== '.nvmrc' || step.with?.['node-version'] !== undefined) {
        problems.push(`${file}: actions/setup-node must use node-version-file: .nvmrc`);
      }
    }
  }
  return problems;
}

function main() {
  const problems = checkNodeVersion();
  if (problems.length === 0) {
    console.log('check-node-version: .nvmrc, engines, @types/node, Dockerfiles and workflows agree.');
    return;
  }
  for (const problem of problems) console.error(`check-node-version: ${problem}`);
  process.exitCode = 1;
}

if (isMain(import.meta.url)) main();
