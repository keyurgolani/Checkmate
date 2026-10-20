/**
 * Resolves the pinned PocketBase binary for the fixture.
 *
 * - Version: `ARG PB_VERSION` in docker/pocketbase/Dockerfile.
 * - Checksums: docker/pocketbase/pocketbase.sha256 (sha256sum format).
 * - Cache: .cache/pocketbase/<version>/<zip>, verified on download and
 *   re-hashed before every extraction.
 */

import { createHash, randomBytes } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { FixtureError } from './errors';
import { readZipEntry } from './zip';

export const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
export const VERSION_SOURCE = path.join(REPO_ROOT, 'docker/pocketbase/Dockerfile');
export const CHECKSUM_FILE = path.join(REPO_ROOT, 'docker/pocketbase/pocketbase.sha256');
export const DEFAULT_CACHE_DIR = path.join(REPO_ROOT, '.cache/pocketbase');
export const RELEASE_BASE_URL = 'https://github.com/pocketbase/pocketbase/releases/download';

const DOWNLOAD_TIMEOUT_MS = 120_000;
const ARCHES: Record<string, string> = { x64: 'amd64', arm64: 'arm64' };

/** Overrides for fixture tests. Defaults resolve the real pinned binary. */
export interface BinaryOptions {
  version?: string;
  platform?: NodeJS.Platform;
  arch?: string;
  cacheDir?: string;
  downloadBaseUrl?: string;
  checksumFile?: string;
}

export interface PocketBaseZip {
  version: string;
  asset: string;
  zipPath: string;
  sha256: string;
}

export async function readPocketBaseVersion(dockerfile = VERSION_SOURCE): Promise<string> {
  const text = await fs.readFile(dockerfile, 'utf8');
  const match = /^ARG PB_VERSION=(\S+)\s*$/m.exec(text);
  if (!match?.[1]) throw new Error(`${dockerfile} has no "ARG PB_VERSION=" line`);
  return match[1];
}

/** Parses sha256sum output: "<64 hex>  <file>" or "<64 hex> *<file>". */
export function parseChecksums(text: string): Map<string, string> {
  const sums = new Map<string, string>();
  for (const line of text.split('\n')) {
    const trimmed = line.trim();
    if (trimmed === '' || trimmed.startsWith('#')) continue;
    const match = /^([0-9a-f]{64}) [ *](\S+)$/.exec(trimmed);
    if (!match?.[1] || !match[2]) throw new Error(`malformed checksum line: ${trimmed}`);
    sums.set(match[2], match[1]);
  }
  return sums;
}

export function assetName(version: string, platform: NodeJS.Platform, arch: string): string {
  if (platform === 'win32') {
    throw new FixtureError(
      'FIXTURE_UNSUPPORTED_PLATFORM',
      'the PocketBase fixture does not run on Windows',
      'run npm test inside WSL, where the fixture uses the linux build',
    );
  }
  const cpu = ARCHES[arch];
  if ((platform !== 'darwin' && platform !== 'linux') || !cpu) {
    throw new FixtureError(
      'FIXTURE_UNSUPPORTED_PLATFORM',
      `no pinned PocketBase build for ${platform}/${arch}`,
      'run the tests on linux or macOS with amd64 or arm64 (on Windows, use WSL)',
    );
  }
  return `pocketbase_${version}_${platform}_${cpu}.zip`;
}

export function sha256(bytes: Uint8Array): string {
  return createHash('sha256').update(bytes).digest('hex');
}

/** Returns the cached zip for this platform, downloading and verifying it when missing. */
export async function ensurePocketBaseZip(options: BinaryOptions = {}): Promise<PocketBaseZip> {
  const version = options.version ?? (await readPocketBaseVersion());
  const asset = assetName(version, options.platform ?? process.platform, options.arch ?? process.arch);
  const checksumFile = options.checksumFile ?? CHECKSUM_FILE;
  const expected = parseChecksums(await fs.readFile(checksumFile, 'utf8')).get(asset);
  if (!expected) {
    throw new FixtureError(
      'FIXTURE_CHECKSUM_MISMATCH',
      `${display(checksumFile)} pins no SHA-256 for ${asset}`,
      `add the SHA-256 of ${asset} from the PocketBase v${version} release checksums.txt to ${display(checksumFile)}`,
    );
  }

  const zipPath = path.join(options.cacheDir ?? DEFAULT_CACHE_DIR, version, asset);
  if (!(await exists(zipPath))) {
    const url = `${options.downloadBaseUrl ?? RELEASE_BASE_URL}/v${version}/${asset}`;
    await download(url, zipPath, expected);
  }
  return { version, asset, zipPath, sha256: expected };
}

/** Re-hashes the cached zip, then writes its `pocketbase` entry into `destDir`. */
export async function installPocketBaseBinary(zip: PocketBaseZip, destDir: string): Promise<string> {
  const bytes = await fs.readFile(zip.zipPath);
  const actual = sha256(bytes);
  if (actual !== zip.sha256) {
    throw new FixtureError(
      'FIXTURE_CHECKSUM_MISMATCH',
      `${display(zip.zipPath)} has SHA-256 ${actual}, but the pinned value is ${zip.sha256}`,
      `delete ${display(zip.zipPath)} and re-run; the fixture downloads it again`,
    );
  }
  const binary = readZipEntry(bytes, 'pocketbase');
  await fs.mkdir(destDir, { recursive: true });
  const target = path.join(destDir, 'pocketbase');
  await fs.writeFile(target, binary, { mode: 0o755 });
  return target;
}

async function download(url: string, destination: string, expected: string): Promise<void> {
  await fs.mkdir(path.dirname(destination), { recursive: true });
  const partial = `${destination}.${process.pid}-${randomBytes(4).toString('hex')}.part`;
  const fix = `check network access to ${new URL(url).host}, or save ${path.basename(destination)} from the PocketBase release into ${display(path.dirname(destination))}/`;

  let response: Response;
  try {
    response = await fetch(url, { redirect: 'follow', signal: AbortSignal.timeout(DOWNLOAD_TIMEOUT_MS) });
  } catch (error) {
    throw new FixtureError('FIXTURE_DOWNLOAD_FAILED', `GET ${url} failed: ${describe(error)}`, fix);
  }
  if (!response.ok || !response.body) {
    throw new FixtureError('FIXTURE_DOWNLOAD_FAILED', `GET ${url} returned HTTP ${response.status}`, fix);
  }

  const hash = createHash('sha256');
  const file = await fs.open(partial, 'w');
  let failure: unknown;
  try {
    const reader = response.body.getReader();
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      hash.update(value);
      await file.write(value);
    }
  } catch (error) {
    failure = error;
  } finally {
    await file.close();
  }
  if (failure !== undefined) {
    await fs.rm(partial, { force: true });
    throw new FixtureError('FIXTURE_DOWNLOAD_FAILED', `GET ${url} broke off: ${describe(failure)}`, fix);
  }

  const actual = hash.digest('hex');
  if (actual !== expected) {
    await fs.rm(partial, { force: true });
    throw new FixtureError(
      'FIXTURE_CHECKSUM_MISMATCH',
      `${url} has SHA-256 ${actual}, but docker/pocketbase/pocketbase.sha256 pins ${expected}`,
      'compare the pinned value with checksums.txt of the PocketBase release; never update the pin to match an unverified download',
    );
  }
  await fs.rename(partial, destination);
}

async function exists(file: string): Promise<boolean> {
  try {
    await fs.access(file);
    return true;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return false;
    throw error;
  }
}

function display(file: string): string {
  const relative = path.relative(REPO_ROOT, file);
  return relative.startsWith('..') ? file : relative;
}

function describe(error: unknown): string {
  if (error instanceof Error) {
    const cause = (error as Error & { cause?: unknown }).cause;
    return cause instanceof Error ? `${error.message} (${cause.message})` : error.message;
  }
  return String(error);
}
