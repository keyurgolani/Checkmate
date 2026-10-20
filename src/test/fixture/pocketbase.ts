/**
 * Hermetic PocketBase fixture.
 *
 * `startPocketBase()` runs the pinned PocketBase binary on a free loopback
 * port with a fresh data directory and a random per-run superuser, so tests
 * never touch a developer's database, port 8090 or credentials.
 *
 * The superuser exists only in this process, its token, and the optional
 * mode-0600 file that `stop()` deletes. It never enters the test env.
 */

import { execFileSync, spawn, type ChildProcess } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { once } from 'node:events';
import { readFileSync } from 'node:fs';
import fs from 'node:fs/promises';
import { createRequire } from 'node:module';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import type PocketBase from 'pocketbase';
import { ensurePocketBaseZip, installPocketBaseBinary, REPO_ROOT, type BinaryOptions } from './binary';
import { adminClient, seedUser, type SeedUserOptions, type SeededUser } from './client';
import { FixtureError } from './errors';

/** The collections pb_schema.json defines; `schema: 'baseline'` requires all of them. */
export const BASELINE_COLLECTIONS = [
  'users',
  'workspaces',
  'blueprints',
  'items',
  'collaborators',
  'instances',
  'instanceItems',
  'notifications',
  'activityLog',
] as const;

/** Parent of every fixture run directory. Each start removes runs whose owner died. */
export const RUNS_ROOT = path.join(os.tmpdir(), 'checkmate-pocketbase-fixture');

const DEFAULT_START_TIMEOUT_MS = 20_000;
const SCHEMA_TIMEOUT_MS = 60_000;
const STOP_GRACE_MS = 5_000;
const AUTO_PORT_ATTEMPTS = 3;
const DEV_COMPOSE_PORT = 8090;

export interface StartPocketBaseOptions {
  /** PocketBase data directory. Defaults to a fresh temp directory that `stop()` deletes. */
  dataDir?: string;
  /** Data directory copied into `dataDir` before start. Implies `schema: 'none'`. */
  snapshot?: string;
  /** `'baseline'` (default) loads pb_schema.json through ensureSchemaInitialized. */
  schema?: 'baseline' | 'none';
  /** JS migrations PocketBase applies on start. */
  migrationsDir?: string;
  /** Fixed port. Defaults to a free loopback port. */
  port?: number;
  /** Health wait. Defaults to 20 seconds. */
  startTimeoutMs?: number;
  /** Keep PocketBase running after this process exits (`npm run fixture -- start`). */
  detached?: boolean;
  /** Write the superuser to this mode-0600 file, outside the data directory. `stop()` deletes it. */
  superuserFile?: string;
  /** Binary overrides for fixture tests. */
  binary?: BinaryOptions;
}

export interface PocketBaseFixture {
  readonly url: string;
  readonly port: number;
  readonly dataDir: string;
  readonly runDir: string;
  readonly adminToken: string;
  /** PID of the running PocketBase process. */
  readonly pid: number;
  /** A client authenticated as the per-run superuser. */
  admin(): PocketBase;
  /** Creates a user through the superuser. */
  seedUser(options?: SeedUserOptions): Promise<SeededUser>;
  /** Stops and starts PocketBase on the same data directory and port. */
  restart(): Promise<void>;
  /** Stops PocketBase and deletes the run directory and superuser file. */
  stop(): Promise<void>;
}

interface Directories {
  data: string;
  migrations: string;
  hooks: string;
  public: string;
}

interface OwnerRecord {
  ownerPid: number;
  pbPid: number | null;
  detached: boolean;
  createdAt: string;
}

interface Superuser {
  email: string;
  password: string;
}

export async function startPocketBase(options: StartPocketBaseOptions = {}): Promise<PocketBaseFixture> {
  if (options.snapshot && options.schema === 'baseline') {
    throw new TypeError('startPocketBase: a snapshot implies schema "none"; drop schema: "baseline"');
  }
  const schema = options.snapshot ? 'none' : (options.schema ?? 'baseline');
  if (options.superuserFile && options.dataDir && isInside(options.superuserFile, options.dataDir)) {
    throw new TypeError('startPocketBase: superuserFile must be outside the data directory');
  }

  await removeStaleRuns();
  const zip = await ensurePocketBaseZip(options.binary);
  const runDir = await createRunDir(options.detached ?? false);
  let server: Server | undefined;

  try {
    const binary = await installPocketBaseBinary(zip, path.join(runDir, 'bin'));
    const dirs: Directories = {
      data: options.dataDir ? path.resolve(options.dataDir) : path.join(runDir, 'pb_data'),
      migrations: options.migrationsDir ? path.resolve(options.migrationsDir) : path.join(runDir, 'pb_migrations'),
      hooks: path.join(runDir, 'pb_hooks'),
      public: path.join(runDir, 'pb_public'),
    };
    if (options.snapshot) await copySnapshot(options.snapshot, dirs.data);
    await Promise.all(Object.values(dirs).map((dir) => fs.mkdir(dir, { recursive: true })));

    const superuser: Superuser = {
      email: `superuser-${randomBytes(6).toString('hex')}@fixture.test`,
      password: randomBytes(24).toString('hex'),
    };
    maskInCi(superuser.password);
    await upsertSuperuser(binary, dirs, superuser, runDir);

    server = new Server(binary, dirs, runDir, options.detached ?? false, options.startTimeoutMs ?? DEFAULT_START_TIMEOUT_MS);
    await server.start(options.port);
    const adminToken = await authenticate(server.url, superuser);
    maskInCi(adminToken);

    if (schema === 'baseline') await loadBaselineSchema(server.url, adminToken, superuser);
    if (options.superuserFile) await writeSuperuserFile(options.superuserFile, server.url, superuser);

    return createHandle(server, dirs.data, runDir, adminToken, options.superuserFile);
  } catch (error) {
    await server?.stop();
    await fs.rm(runDir, { recursive: true, force: true });
    throw error;
  }
}

/** Stops a detached fixture started by another process (the CLI's `stop`). */
export async function stopDetachedPocketBase(instance: { pid: number; runDir: string; superuserFile?: string }): Promise<void> {
  if (isPocketBaseFor(instance.pid, instance.runDir)) {
    await terminatePid(instance.pid);
  }
  await fs.rm(instance.runDir, { recursive: true, force: true });
  if (instance.superuserFile) await fs.rm(instance.superuserFile, { force: true });
}

/**
 * Node arguments that run a TypeScript file through tsx's loader in one
 * process. (The tsx CLI wraps a second process, which a kill would orphan.)
 */
export function tsxNodeArgs(script: string): string[] {
  const loader = createRequire(import.meta.url).resolve('tsx');
  return ['--import', pathToFileURL(loader).href, script];
}

/** True when `pid` is a live PocketBase process serving from `runDir`. */
export function isPocketBaseFor(pid: number | null | undefined, runDir: string): boolean {
  if (!pid || !isAlive(pid)) return false;
  const command = processCommand(pid);
  return command !== null && command.includes(runDir) && command.includes('pocketbase');
}

function createHandle(
  server: Server,
  dataDir: string,
  runDir: string,
  adminToken: string,
  superuserFile: string | undefined,
): PocketBaseFixture {
  let stopped = false;
  return {
    get url() {
      return server.url;
    },
    get port() {
      return server.port;
    },
    get pid() {
      return server.pid;
    },
    dataDir,
    runDir,
    adminToken,
    admin: () => adminClient(server.url, adminToken),
    seedUser: (options) => seedUser(server.url, adminToken, options),
    async restart() {
      if (stopped) throw new Error('restart(): this fixture was stopped');
      await server.stop();
      await server.start(server.port);
    },
    async stop() {
      if (stopped) return;
      stopped = true;
      await server.stop();
      await fs.rm(runDir, { recursive: true, force: true });
      if (superuserFile) await fs.rm(superuserFile, { force: true });
    },
  };
}

class Server {
  private child: ChildProcess | undefined;
  private currentPort = 0;

  constructor(
    private readonly binary: string,
    private readonly dirs: Directories,
    private readonly runDir: string,
    private readonly detached: boolean,
    private readonly startTimeoutMs: number,
  ) {}

  get port(): number {
    return this.currentPort;
  }

  get url(): string {
    return `http://127.0.0.1:${this.currentPort}`;
  }

  get pid(): number {
    if (!this.child?.pid) throw new Error('PocketBase is not running');
    return this.child.pid;
  }

  /** Starts on `port`, or on a free port, retrying when another process takes it first. */
  async start(port?: number): Promise<void> {
    const attempts = port === undefined ? AUTO_PORT_ATTEMPTS : 1;
    for (let attempt = 1; ; attempt++) {
      const candidate = port ?? (await freeLoopbackPort());
      try {
        await assertPortFree(candidate);
        await this.spawnAndWait(candidate);
        return;
      } catch (error) {
        const retry = error instanceof FixtureError && error.code === 'FIXTURE_PORT_IN_USE' && attempt < attempts;
        if (!retry) throw error;
      }
    }
  }

  async stop(): Promise<void> {
    const child = this.child;
    this.child = undefined;
    if (!child || child.exitCode !== null || child.signalCode !== null) return;
    const exited = once(child, 'exit');
    child.kill('SIGTERM');
    const timer = setTimeout(() => child.kill('SIGKILL'), STOP_GRACE_MS);
    await exited;
    clearTimeout(timer);
  }

  private async spawnAndWait(port: number): Promise<void> {
    const logPath = path.join(this.runDir, 'pocketbase.log');
    const log = await fs.open(logPath, 'a');
    const logStart = (await log.stat()).size;
    let child: ChildProcess;
    let spawned: Promise<unknown>;
    let exited = false;
    try {
      child = spawn(
        this.binary,
        [
          'serve',
          `--http=127.0.0.1:${port}`,
          `--dir=${this.dirs.data}`,
          `--migrationsDir=${this.dirs.migrations}`,
          `--hooksDir=${this.dirs.hooks}`,
          `--publicDir=${this.dirs.public}`,
          '--automigrate=false',
          '--hooksWatch=false',
        ],
        { stdio: ['ignore', log.fd, log.fd], detached: this.detached },
      );
      // Listen before the next await: both events can fire while the log closes.
      spawned = once(child, 'spawn');
      child.once('exit', () => (exited = true));
    } finally {
      await log.close();
    }
    await spawned;
    this.child = child;
    this.currentPort = port;
    if (this.detached) child.unref();
    else trackForExit(child);
    await updateOwner(this.runDir, { pbPid: child.pid ?? null });

    // Every health request must finish inside the deadline, or a slow first
    // answer would count as a start within it.
    const deadline = Date.now() + this.startTimeoutMs;
    for (;;) {
      if (exited) {
        this.child = undefined;
        const output = await tail(logPath, logStart);
        if (/address already in use/i.test(output)) {
          throw new FixtureError(
            'FIXTURE_PORT_IN_USE',
            `port ${port} is already in use`,
            `free the port (lsof -nP -iTCP:${port} -sTCP:LISTEN) or re-run`,
          );
        }
        throw new FixtureError('FIXTURE_START_FAILED', `PocketBase exited during start:\n${output}`, 'read the PocketBase output above');
      }
      const remaining = deadline - Date.now();
      if (remaining <= 0) {
        await this.stop();
        throw new FixtureError(
          'FIXTURE_START_TIMEOUT',
          `PocketBase did not answer ${this.url}/api/health within ${this.startTimeoutMs / 1000}s:\n${await tail(logPath, logStart)}`,
          'read the PocketBase output above; on an overloaded machine, re-run with fewer parallel jobs',
        );
      }
      if (await isHealthy(this.url, Math.min(1_000, remaining))) return;
      await sleep(Math.min(100, Math.max(0, deadline - Date.now())));
    }
  }
}

async function upsertSuperuser(binary: string, dirs: Directories, superuser: Superuser, runDir: string): Promise<void> {
  const result = await run(
    binary,
    [
      'superuser',
      'upsert',
      `--dir=${dirs.data}`,
      `--migrationsDir=${dirs.migrations}`,
      `--hooksDir=${dirs.hooks}`,
      '--',
      superuser.email,
      superuser.password,
    ],
    { cwd: runDir, timeoutMs: DEFAULT_START_TIMEOUT_MS },
  );
  // PocketBase exits 0 even when a command fails, so check what it printed.
  if (result.code !== 0 || !result.output.includes('Successfully saved superuser')) {
    throw new FixtureError(
      'FIXTURE_START_FAILED',
      `pocketbase superuser upsert failed (exit ${result.code}):\n${redact(result.output, superuser)}`,
      'read the PocketBase output above',
    );
  }
}

async function authenticate(url: string, superuser: Superuser): Promise<string> {
  const response = await fetch(`${url}/api/collections/_superusers/auth-with-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identity: superuser.email, password: superuser.password }),
  });
  const body = (await response.json().catch(() => ({}))) as { token?: string };
  if (!response.ok || !body.token) {
    throw new FixtureError(
      'FIXTURE_START_FAILED',
      `superuser authentication returned HTTP ${response.status}; another server may hold the port`,
      're-run; if it repeats, check which process listens on the fixture port',
    );
  }
  return body.token;
}

/**
 * Loads pb_schema.json through ensureSchemaInitialized, the server's start
 * path. schema-init reads its URL and credentials at import time, so it runs
 * in a child process whose env carries this run's values; the test process
 * env never holds them.
 */
async function loadBaselineSchema(url: string, adminToken: string, superuser: Superuser): Promise<void> {
  const script = fileURLToPath(new URL('./schema-baseline.ts', import.meta.url));
  const env: NodeJS.ProcessEnv = {
    ...process.env,
    POCKETBASE_URL: url,
    NEXT_PUBLIC_POCKETBASE_URL: url,
    PB_ADMIN_EMAIL: superuser.email,
    PB_ADMIN_PASSWORD: superuser.password,
    DEMO_USER_EMAIL: `demo-${randomBytes(6).toString('hex')}@fixture.test`,
    DEMO_USER_PASSWORD: randomBytes(24).toString('hex'),
  };
  delete env.POCKETBASE_ADMIN_EMAIL;
  delete env.POCKETBASE_ADMIN_PASSWORD;

  const result = await run(process.execPath, tsxNodeArgs(script), { cwd: REPO_ROOT, env, timeoutMs: SCHEMA_TIMEOUT_MS });
  if (result.code !== 0) {
    throw new FixtureError(
      'FIXTURE_SCHEMA_FAILED',
      `ensureSchemaInitialized did not return true:\n${redact(result.output, superuser)}`,
      'read the schema-init output above and check docker/pocketbase/pb_schema.json',
    );
  }

  const response = await fetch(`${url}/api/collections?perPage=500&fields=name`, { headers: { Authorization: adminToken } });
  if (!response.ok) {
    throw new FixtureError('FIXTURE_SCHEMA_FAILED', `listing collections returned HTTP ${response.status}`, 're-run; if it repeats, read the PocketBase log');
  }
  const names = new Set(((await response.json()) as { items: { name: string }[] }).items.map((item) => item.name));
  const missing = BASELINE_COLLECTIONS.filter((name) => !names.has(name));
  if (missing.length > 0) {
    throw new FixtureError(
      'FIXTURE_SCHEMA_FAILED',
      `the baseline schema is missing ${missing.join(', ')}`,
      'check docker/pocketbase/pb_schema.json and the schema-init output',
    );
  }
}

async function writeSuperuserFile(file: string, url: string, superuser: Superuser): Promise<void> {
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.rm(file, { force: true });
  await fs.writeFile(file, `${JSON.stringify({ url, ...superuser }, null, 2)}\n`, { mode: 0o600, flag: 'wx' });
}

async function createRunDir(detached: boolean): Promise<string> {
  await fs.mkdir(RUNS_ROOT, { recursive: true });
  const runDir = await fs.mkdtemp(path.join(RUNS_ROOT, `run-${process.pid}-`));
  const owner: OwnerRecord = { ownerPid: process.pid, pbPid: null, detached, createdAt: new Date().toISOString() };
  await fs.writeFile(path.join(runDir, 'owner.json'), JSON.stringify(owner));
  return runDir;
}

async function updateOwner(runDir: string, update: Partial<OwnerRecord>): Promise<void> {
  const file = path.join(runDir, 'owner.json');
  const owner = JSON.parse(await fs.readFile(file, 'utf8')) as OwnerRecord;
  await fs.writeFile(file, JSON.stringify({ ...owner, ...update }));
}

/** Deletes run directories whose owner died, killing any PocketBase they left running. */
async function removeStaleRuns(): Promise<void> {
  let entries: string[];
  try {
    entries = await fs.readdir(RUNS_ROOT);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return;
    throw error;
  }

  await Promise.all(
    entries.filter((name) => name.startsWith('run-')).map((name) => removeIfStale(path.join(RUNS_ROOT, name))),
  );
}

async function removeIfStale(runDir: string): Promise<void> {
  try {
    const owner = await readOwner(runDir);
    if (owner === null) {
      // No readable owner file: a run that crashed while starting. Give a
      // concurrent start a minute to write its file before deleting.
      const { mtimeMs } = await fs.stat(runDir);
      if (Date.now() - mtimeMs > 60_000) await fs.rm(runDir, { recursive: true, force: true });
      return;
    }
    const alive = owner.detached ? isPocketBaseFor(owner.pbPid, runDir) : isAlive(owner.ownerPid);
    if (alive) return;
    if (owner.pbPid && isPocketBaseFor(owner.pbPid, runDir)) process.kill(owner.pbPid, 'SIGKILL');
    await fs.rm(runDir, { recursive: true, force: true });
  } catch (error) {
    // Another start removed this directory first.
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
  }
}

async function readOwner(runDir: string): Promise<OwnerRecord | null> {
  try {
    return JSON.parse(await fs.readFile(path.join(runDir, 'owner.json'), 'utf8')) as OwnerRecord;
  } catch {
    return null;
  }
}

async function copySnapshot(snapshot: string, dataDir: string): Promise<void> {
  const existing = await fs.readdir(dataDir).catch((error: NodeJS.ErrnoException) => {
    if (error.code === 'ENOENT') return [];
    throw error;
  });
  if (existing.length > 0) throw new TypeError(`startPocketBase: dataDir ${dataDir} must be empty to receive a snapshot`);
  await fs.cp(path.resolve(snapshot), dataDir, { recursive: true });
}

const trackedChildren = new Set<ChildProcess>();
let exitHookInstalled = false;

/** Kills attached PocketBase processes if this process exits without stopping them. */
function trackForExit(child: ChildProcess): void {
  trackedChildren.add(child);
  child.once('exit', () => trackedChildren.delete(child));
  if (exitHookInstalled) return;
  exitHookInstalled = true;
  process.once('exit', () => {
    for (const tracked of trackedChildren) tracked.kill('SIGKILL');
  });
}

async function freeLoopbackPort(): Promise<number> {
  for (;;) {
    const port = await new Promise<number>((resolve, reject) => {
      const probe = net.createServer();
      probe.once('error', reject);
      probe.listen(0, '127.0.0.1', () => {
        const address = probe.address();
        probe.close(() => (typeof address === 'object' && address ? resolve(address.port) : reject(new Error('no port'))));
      });
    });
    if (port !== DEV_COMPOSE_PORT) return port;
  }
}

async function assertPortFree(port: number): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const probe = net.createServer();
    probe.once('error', (error: NodeJS.ErrnoException) => {
      if (error.code !== 'EADDRINUSE') return reject(error);
      reject(
        new FixtureError(
          'FIXTURE_PORT_IN_USE',
          `port ${port} is already in use`,
          `free the port (lsof -nP -iTCP:${port} -sTCP:LISTEN) or re-run`,
        ),
      );
    });
    probe.listen(port, '127.0.0.1', () => probe.close(() => resolve()));
  });
}

async function isHealthy(url: string, timeoutMs: number): Promise<boolean> {
  try {
    const response = await fetch(`${url}/api/health`, { signal: AbortSignal.timeout(timeoutMs) });
    return response.ok;
  } catch {
    return false; // not listening yet
  }
}

function isAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return (error as NodeJS.ErrnoException).code === 'EPERM';
  }
}

function processCommand(pid: number): string | null {
  try {
    if (process.platform === 'linux') {
      return readFileSync(`/proc/${pid}/cmdline`, 'utf8').replaceAll('\0', ' ');
    }
    return execFileSync('ps', ['-p', String(pid), '-o', 'command='], { encoding: 'utf8' });
  } catch {
    return null; // the process exited between the liveness check and this read
  }
}

async function terminatePid(pid: number): Promise<void> {
  process.kill(pid, 'SIGTERM');
  const deadline = Date.now() + STOP_GRACE_MS;
  while (isAlive(pid)) {
    if (Date.now() > deadline) {
      process.kill(pid, 'SIGKILL');
      return;
    }
    await sleep(100);
  }
}

interface RunResult {
  code: number;
  output: string;
}

async function run(
  command: string,
  args: string[],
  options: { cwd: string; env?: NodeJS.ProcessEnv; timeoutMs: number },
): Promise<RunResult> {
  const child = spawn(command, args, { cwd: options.cwd, env: options.env ?? process.env, stdio: ['ignore', 'pipe', 'pipe'] });
  let output = '';
  child.stdout.on('data', (chunk: Buffer) => (output += chunk.toString()));
  child.stderr.on('data', (chunk: Buffer) => (output += chunk.toString()));
  const timer = setTimeout(() => child.kill('SIGKILL'), options.timeoutMs);
  const [code, signal] = (await once(child, 'exit')) as [number | null, NodeJS.Signals | null];
  clearTimeout(timer);
  return { code: code ?? (signal ? 128 : 1), output };
}

/** The last lines a process wrote to `file` after byte offset `from`. */
async function tail(file: string, from: number, lines = 30): Promise<string> {
  const bytes = await fs.readFile(file);
  return bytes.subarray(from).toString('utf8').trimEnd().split('\n').slice(-lines).join('\n');
}

function redact(output: string, superuser: Superuser): string {
  return output.replaceAll(superuser.password, '***').trimEnd();
}

function maskInCi(value: string): void {
  if (process.env.GITHUB_ACTIONS === 'true') process.stdout.write(`::add-mask::${value}\n`);
}

function isInside(file: string, dir: string): boolean {
  const relative = path.relative(path.resolve(dir), path.resolve(file));
  return relative !== '' && !relative.startsWith('..') && !path.isAbsolute(relative);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
