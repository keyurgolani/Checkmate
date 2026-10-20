/**
 * PocketBase fixture tests. A fake release server stands in for GitHub,
 * serving the real pinned zip or a broken response.
 */

import { spawn } from 'node:child_process';
import { once } from 'node:events';
import fs from 'node:fs/promises';
import http from 'node:http';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { assetName, ensurePocketBaseZip, REPO_ROOT, sha256 } from './binary';
import { FixtureError, isFixtureError, type FixtureErrorCode } from './errors';
import { isPocketBaseFor, RUNS_ROOT, startPocketBase, tsxNodeArgs, type PocketBaseFixture } from './pocketbase';
import { zipOf } from './test-zip';

const fixtureDir = path.join(REPO_ROOT, 'src/test/fixture');

let realZip: Buffer;
let version: string;
let asset: string;
const running: PocketBaseFixture[] = [];
const tempDirs: string[] = [];

beforeAll(async () => {
  const zip = await ensurePocketBaseZip();
  realZip = await fs.readFile(zip.zipPath);
  version = zip.version;
  asset = zip.asset;
});

afterEach(async () => {
  await Promise.all(running.splice(0).map((fixture) => fixture.stop()));
});

afterAll(async () => {
  await Promise.all(tempDirs.map((dir) => fs.rm(dir, { recursive: true, force: true })));
});

async function track(start: Promise<PocketBaseFixture>): Promise<PocketBaseFixture> {
  const fixture = await start;
  running.push(fixture);
  return fixture;
}

async function tempDir(label: string): Promise<string> {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), `cm-fixture-test-${label}-`));
  tempDirs.push(dir);
  return dir;
}

async function expectFixtureError(start: Promise<unknown>, code: FixtureErrorCode): Promise<FixtureError> {
  const error = await start.then(
    () => new Error(`expected ${code}, but the fixture started`),
    (rejection: unknown) => rejection,
  );
  expect(isFixtureError(error, code), String(error)).toBe(true);
  return error as FixtureError;
}

interface FakeReleases {
  url: string;
  requests: string[];
  close(): Promise<void>;
}

async function fakeReleases(respond: (response: http.ServerResponse) => void): Promise<FakeReleases> {
  const requests: string[] = [];
  const server = http.createServer((request, response) => {
    requests.push(request.url ?? '');
    respond(response);
  });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const { port } = server.address() as net.AddressInfo;
  return {
    url: `http://127.0.0.1:${port}`,
    requests,
    close: () => new Promise((resolve) => server.close(() => resolve())),
  };
}

function tampered(bytes: Buffer): Buffer {
  const copy = Buffer.from(bytes);
  const offset = copy.length - 100;
  copy.writeUInt8(copy.readUInt8(offset) ^ 0xff, offset);
  return copy;
}

async function runDirs(): Promise<string[]> {
  return fs.readdir(RUNS_ROOT).catch(() => []);
}

async function readOwner(runDir: string): Promise<{ ownerPid: number; pbPid: number | null } | null> {
  return fs
    .readFile(path.join(RUNS_ROOT, runDir, 'owner.json'), 'utf8')
    .then((text) => JSON.parse(text) as { ownerPid: number; pbPid: number | null })
    .catch(() => null);
}

/** Polls `probe` every 10 ms until it returns a value or `timeoutMs` passes. */
async function waitFor<T>(probe: () => Promise<T | undefined>, timeoutMs: number): Promise<T | undefined> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const value = await probe();
    if (value !== undefined) return value;
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  return undefined;
}

/** CI masks secrets through `::add-mask::` lines; pass a child's on to the runner. */
function forwardMasks(output: string): string {
  const kept: string[] = [];
  for (const line of output.split('\n')) {
    if (line.startsWith('::add-mask::')) process.stdout.write(`${line}\n`);
    else kept.push(line);
  }
  return kept.join('\n');
}

function spawnTsx(script: string, args: string[], env: NodeJS.ProcessEnv) {
  const child = spawn(process.execPath, [...tsxNodeArgs(path.join(fixtureDir, script)), ...args], {
    cwd: REPO_ROOT,
    env,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let output = '';
  child.stdout.on('data', (chunk: Buffer) => (output += chunk.toString()));
  child.stderr.on('data', (chunk: Buffer) => (output += chunk.toString()));
  const done = once(child, 'exit').then(([code]) => ({ code: code as number | null, output: forwardMasks(output) }));
  return { child, done };
}

async function runTsx(script: string, args: string[], env: NodeJS.ProcessEnv): Promise<{ code: number | null; output: string }> {
  return spawnTsx(script, args, env).done;
}

/**
 * A cached zip whose `pocketbase` is a shell script: it answers
 * `superuser upsert`, then deletes itself, so the serve spawn fails.
 */
async function selfDeletingBinary(): Promise<{ version: string; cacheDir: string; checksumFile: string }> {
  const fakeVersion = '0.0.0-selfdeleting';
  const script = ['#!/bin/sh', 'if [ "$1" = superuser ]; then', '  rm -f "$0"', '  echo \'Successfully saved superuser "fixture"!\'', 'fi', ''].join('\n');
  const zip = zipOf('pocketbase', Buffer.from(script));
  const fakeAsset = assetName(fakeVersion, process.platform, process.arch);
  const cacheDir = await tempDir('fake-binary');
  await fs.mkdir(path.join(cacheDir, fakeVersion), { recursive: true });
  await fs.writeFile(path.join(cacheDir, fakeVersion, fakeAsset), zip);
  const checksumFile = path.join(cacheDir, 'pocketbase.sha256');
  await fs.writeFile(checksumFile, `${sha256(zip)}  ${fakeAsset}\n`);
  return { version: fakeVersion, cacheDir, checksumFile };
}

describe('startPocketBase', () => {
  it('downloads the pinned zip, verifies and caches it, then starts', async () => {
    const releases = await fakeReleases((response) => response.end(realZip));
    try {
      const cacheDir = await tempDir('cache');
      const binary = { cacheDir, downloadBaseUrl: releases.url };

      const fixture = await track(startPocketBase({ schema: 'none', binary }));
      expect(releases.requests).toEqual([`/v${version}/${asset}`]);
      expect(sha256(await fs.readFile(path.join(cacheDir, version, asset)))).toBe(sha256(realZip));
      expect((await fixture.admin().health.check()).code).toBe(200);
      expect(fixture.url).toBe(`http://127.0.0.1:${fixture.port}`);
      expect(fixture.port).not.toBe(8090);

      await track(startPocketBase({ schema: 'none', binary }));
      expect(releases.requests).toHaveLength(1);
    } finally {
      await releases.close();
    }
  });

  it('fails with FIXTURE_DOWNLOAD_FAILED when the release host returns an error', async () => {
    const releases = await fakeReleases((response) => {
      response.statusCode = 404;
      response.end('Not Found');
    });
    try {
      const cacheDir = await tempDir('cache');
      const error = await expectFixtureError(
        startPocketBase({ schema: 'none', binary: { cacheDir, downloadBaseUrl: releases.url } }),
        'FIXTURE_DOWNLOAD_FAILED',
      );
      expect(error.message).toContain('HTTP 404');
      expect(error.fix).toContain('check network access');
      expect(await fs.readdir(path.join(cacheDir, version))).toEqual([]);
    } finally {
      await releases.close();
    }
  });

  it('fails with FIXTURE_DOWNLOAD_FAILED when the release host is unreachable', async () => {
    const cacheDir = await tempDir('cache');
    await expectFixtureError(
      startPocketBase({ schema: 'none', binary: { cacheDir, downloadBaseUrl: 'http://127.0.0.1:9' } }),
      'FIXTURE_DOWNLOAD_FAILED',
    );
  });

  it('fails with FIXTURE_CHECKSUM_MISMATCH on an altered download and caches nothing', async () => {
    const releases = await fakeReleases((response) => response.end(tampered(realZip)));
    try {
      const cacheDir = await tempDir('cache');
      await expectFixtureError(
        startPocketBase({ schema: 'none', binary: { cacheDir, downloadBaseUrl: releases.url } }),
        'FIXTURE_CHECKSUM_MISMATCH',
      );
      expect(await fs.readdir(path.join(cacheDir, version))).toEqual([]);
    } finally {
      await releases.close();
    }
  });

  it('fails with FIXTURE_CHECKSUM_MISMATCH when the cached zip was altered', async () => {
    const cacheDir = await tempDir('cache');
    await fs.mkdir(path.join(cacheDir, version), { recursive: true });
    await fs.writeFile(path.join(cacheDir, version, asset), tampered(realZip));

    const error = await expectFixtureError(
      startPocketBase({ schema: 'none', binary: { cacheDir, downloadBaseUrl: 'http://127.0.0.1:9' } }),
      'FIXTURE_CHECKSUM_MISMATCH',
    );
    expect(error.fix).toContain('delete');
  });

  it.each([
    ['win32', 'x64', 'WSL'],
    ['linux', 'ia32', 'amd64 or arm64'],
    ['freebsd', 'x64', 'linux or macOS'],
  ] as const)('fails with FIXTURE_UNSUPPORTED_PLATFORM on %s/%s', async (platform, arch, fix) => {
    const error = await expectFixtureError(startPocketBase({ schema: 'none', binary: { platform, arch } }), 'FIXTURE_UNSUPPORTED_PLATFORM');
    expect(error.fix).toContain(fix);
  });

  it('fails with FIXTURE_PORT_IN_USE when the port is taken', async () => {
    const blocker = net.createServer();
    blocker.listen(0, '127.0.0.1');
    await once(blocker, 'listening');
    const { port } = blocker.address() as net.AddressInfo;
    try {
      const error = await expectFixtureError(startPocketBase({ schema: 'none', port }), 'FIXTURE_PORT_IN_USE');
      expect(error.message).toContain(String(port));
    } finally {
      blocker.close();
    }
  });

  it('fails with FIXTURE_START_TIMEOUT and leaves no run behind', async () => {
    const before = await runDirs();
    await expectFixtureError(startPocketBase({ schema: 'none', startTimeoutMs: 1 }), 'FIXTURE_START_TIMEOUT');
    const after = await runDirs();
    expect(after.filter((name) => !before.includes(name))).toEqual([]);
  });

  it('fails with FIXTURE_START_FAILED when the binary cannot be spawned, and cleans up', async () => {
    const unhandled: unknown[] = [];
    const record = (reason: unknown) => unhandled.push(reason);
    process.on('unhandledRejection', record);
    try {
      const before = await runDirs();
      const error = await expectFixtureError(startPocketBase({ schema: 'none', binary: await selfDeletingBinary() }), 'FIXTURE_START_FAILED');
      expect(error.message).toContain('ENOENT');
      const after = await runDirs();
      expect(after.filter((name) => !before.includes(name))).toEqual([]);
      await new Promise((resolve) => setTimeout(resolve, 50));
      expect(unhandled).toEqual([]);
    } finally {
      process.off('unhandledRejection', record);
    }
  });

  it('restart() keeps the data directory, port and superuser token', async () => {
    const fixture = await track(startPocketBase({ schema: 'none' }));
    const user = await fixture.seedUser();
    const { url, port, dataDir, adminToken } = fixture;

    await fixture.restart();

    expect([fixture.url, fixture.port, fixture.dataDir, fixture.adminToken]).toEqual([url, port, dataDir, adminToken]);
    const stored = await fixture.admin().collection('users').getOne(user.id);
    expect(stored.email).toBe(user.email);
  });

  it('runs two isolated instances side by side', async () => {
    const [first, second] = await Promise.all([
      track(startPocketBase({ schema: 'none' })),
      track(startPocketBase({ schema: 'none' })),
    ]);

    expect(first.port).not.toBe(second.port);
    expect(first.dataDir).not.toBe(second.dataDir);
    expect(first.adminToken).not.toBe(second.adminToken);
    const user = await first.seedUser();
    await expect(second.admin().collection('users').getOne(user.id)).rejects.toMatchObject({ status: 404 });
  });

  it('removes runs left by a killed owner, including their PocketBase', async () => {
    const owner = spawn(process.execPath, tsxNodeArgs(path.join(fixtureDir, 'hold-fixture.ts')), {
      cwd: REPO_ROOT,
      stdio: ['ignore', 'pipe', 'inherit'],
    });
    let output = '';
    const line = await new Promise<string>((resolve, reject) => {
      owner.stdout.on('data', (chunk: Buffer) => {
        output += chunk.toString();
        const json = forwardMasks(output).split('\n').find((candidate) => candidate.startsWith('{'));
        if (json) resolve(json);
      });
      owner.once('exit', (code) => reject(new Error(`hold-fixture exited with ${code} before starting:\n${output}`)));
    });
    const leftover = JSON.parse(line) as { runDir: string; pid: number };
    owner.kill('SIGKILL');
    await once(owner, 'exit');
    expect(isPocketBaseFor(leftover.pid, leftover.runDir)).toBe(true);

    await track(startPocketBase({ schema: 'none' }));

    await expect.poll(() => isPocketBaseFor(leftover.pid, leftover.runDir)).toBe(false);
    await expect(fs.access(leftover.runDir)).rejects.toThrow();
  });

  it('keeps a detached run whose server is not up yet while its owner lives', async () => {
    const holder = spawn(process.execPath, ['-e', 'setInterval(() => {}, 60_000)'], { stdio: 'ignore' });
    await once(holder, 'spawn');
    await fs.mkdir(RUNS_ROOT, { recursive: true });
    const runDir = await fs.mkdtemp(path.join(RUNS_ROOT, `run-${holder.pid}-`));
    const owner = { ownerPid: holder.pid, pbPid: null, detached: true, createdAt: new Date().toISOString() };
    await fs.writeFile(path.join(runDir, 'owner.json'), JSON.stringify(owner));
    try {
      await track(startPocketBase({ schema: 'none' }));
      await expect(fs.access(runDir)).resolves.toBeUndefined();

      holder.kill('SIGKILL');
      await once(holder, 'exit');
      await track(startPocketBase({ schema: 'none' }));
      await expect(fs.access(runDir)).rejects.toThrow();
    } finally {
      holder.kill('SIGKILL');
      await fs.rm(runDir, { recursive: true, force: true });
    }
  });
});

describe('npm run fixture', () => {
  it('start serves the baseline schema and keeps the superuser in a mode-0600 file; stop removes everything', async () => {
    const stateDir = await tempDir('cli');
    const env = { ...process.env, CHECKMATE_FIXTURE_STATE_DIR: stateDir };
    const superuserFile = path.join(stateDir, 'superuser.json');

    const started = await runTsx('cli.ts', ['start'], env);
    expect(started.code, started.output).toBe(0);
    const instance = JSON.parse(await fs.readFile(path.join(stateDir, 'instance.json'), 'utf8')) as { url: string; pid: number; runDir: string };
    expect(started.output).toContain(instance.url);
    expect((await fs.stat(superuserFile)).mode & 0o777).toBe(0o600);
    expect(path.relative(instance.runDir, superuserFile).startsWith('..')).toBe(true);

    const superuser = JSON.parse(await fs.readFile(superuserFile, 'utf8')) as { url: string; email: string; password: string };
    expect(started.output).not.toContain(superuser.password);
    expect(isPocketBaseFor(instance.pid, instance.runDir)).toBe(true);
    const auth = await fetch(`${instance.url}/api/collections/_superusers/auth-with-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identity: superuser.email, password: superuser.password }),
    });
    expect(auth.ok).toBe(true);
    const { token } = (await auth.json()) as { token: string };
    const workspaces = await fetch(`${instance.url}/api/collections/workspaces`, { headers: { Authorization: token } });
    expect(workspaces.ok).toBe(true);

    const stopped = await runTsx('cli.ts', ['stop'], env);
    expect(stopped.code, stopped.output).toBe(0);
    expect(isPocketBaseFor(instance.pid, instance.runDir)).toBe(false);
    await expect(fs.access(superuserFile)).rejects.toThrow();
    await expect(fs.access(instance.runDir)).rejects.toThrow();
  });

  it('start survives another start while its PocketBase is still coming up', async () => {
    const stateDir = await tempDir('cli-race');
    const env = { ...process.env, CHECKMATE_FIXTURE_STATE_DIR: stateDir };
    const cli = spawnTsx('cli.ts', ['start'], env);
    try {
      // The CLI's run directory, caught before its PocketBase PID is recorded.
      const caught = await waitFor(async () => {
        if (cli.child.exitCode !== null) return 'exited';
        const name = (await runDirs()).find((candidate) => candidate.startsWith(`run-${cli.child.pid}-`));
        const owner = name ? await readOwner(name) : null;
        return owner && owner.pbPid === null ? name : undefined;
      }, 30_000);
      expect(caught, 'the CLI run directory never showed up before its server').toMatch(/^run-/);

      await track(startPocketBase({ schema: 'none' }));

      const started = await cli.done;
      expect(started.code, started.output).toBe(0);
    } finally {
      await cli.done;
      const stopped = await runTsx('cli.ts', ['stop'], env);
      expect(stopped.code, stopped.output).toBe(0);
    }
  });
});
