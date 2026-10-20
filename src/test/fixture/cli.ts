/**
 * npm run fixture -- start | stop
 *
 * Starts a detached PocketBase fixture with the baseline schema for Playwright
 * and other local tools, or stops it. The superuser is written to a mode-0600
 * file outside the data directory, never printed; `stop` deletes it.
 * CHECKMATE_FIXTURE_STATE_DIR overrides where the state files live.
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { REPO_ROOT } from './binary';
import { isFixtureError } from './errors';
import { isPocketBaseFor, startPocketBase, stopDetachedPocketBase } from './pocketbase';

interface Instance {
  url: string;
  pid: number;
  runDir: string;
}

const stateDir = path.resolve(process.env.CHECKMATE_FIXTURE_STATE_DIR ?? path.join(REPO_ROOT, '.cache/pocketbase/fixture'));
const instanceFile = path.join(stateDir, 'instance.json');
const superuserFile = path.join(stateDir, 'superuser.json');

async function readInstance(): Promise<Instance | null> {
  try {
    return JSON.parse(await fs.readFile(instanceFile, 'utf8')) as Instance;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null;
    throw error;
  }
}

async function start(): Promise<void> {
  const existing = await readInstance();
  if (existing && isPocketBaseFor(existing.pid, existing.runDir)) {
    console.log(`PocketBase fixture already running at ${existing.url}`);
    console.log(`Superuser: ${superuserFile}`);
    return;
  }
  if (existing) await stopDetachedPocketBase({ ...existing, superuserFile });

  const fixture = await startPocketBase({ schema: 'baseline', detached: true, superuserFile });
  const instance: Instance = { url: fixture.url, pid: fixture.pid, runDir: fixture.runDir };
  await fs.mkdir(stateDir, { recursive: true });
  await fs.writeFile(instanceFile, `${JSON.stringify(instance, null, 2)}\n`);
  console.log(`PocketBase fixture running at ${fixture.url}`);
  console.log(`Superuser: ${superuserFile} (mode 0600, deleted by stop)`);
  console.log('Stop it with: npm run fixture -- stop');
}

async function stop(): Promise<void> {
  const instance = await readInstance();
  if (!instance) {
    console.log('No PocketBase fixture is running.');
    return;
  }
  await stopDetachedPocketBase({ ...instance, superuserFile });
  await fs.rm(instanceFile, { force: true });
  console.log('PocketBase fixture stopped.');
}

async function main(command: string | undefined): Promise<void> {
  if (command === 'start') return start();
  if (command === 'stop') return stop();
  console.error('Usage: npm run fixture -- start | stop');
  process.exitCode = 2;
}

main(process.argv[2]).catch((error: unknown) => {
  console.error(isFixtureError(error) ? error.message : error);
  process.exitCode = 1;
});
