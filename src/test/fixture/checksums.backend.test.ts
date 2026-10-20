/**
 * Re-downloads every zip pinned in docker/pocketbase/pocketbase.sha256 and
 * checks its hash, so a wrong pin fails here and not on one platform later.
 */

import { createHash } from 'node:crypto';
import fs from 'node:fs/promises';
import { describe, expect, it } from 'vitest';
import { CHECKSUM_FILE, parseChecksums, readPocketBaseVersion, RELEASE_BASE_URL } from './binary';

const PLATFORMS = ['darwin_amd64', 'darwin_arm64', 'linux_amd64', 'linux_arm64'];

const version = await readPocketBaseVersion();
const pins = parseChecksums(await fs.readFile(CHECKSUM_FILE, 'utf8'));

async function downloadSha256(url: string): Promise<string> {
  const response = await fetch(url, { redirect: 'follow', signal: AbortSignal.timeout(120_000) });
  if (!response.ok || !response.body) throw new Error(`GET ${url} returned HTTP ${response.status}`);
  const hash = createHash('sha256');
  const reader = response.body.getReader();
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    hash.update(value);
  }
  return hash.digest('hex');
}

describe('docker/pocketbase/pocketbase.sha256', () => {
  it('pins the linux and darwin amd64 and arm64 zips of the Dockerfile version', () => {
    expect([...pins.keys()].sort()).toEqual(PLATFORMS.map((platform) => `pocketbase_${version}_${platform}.zip`).sort());
  });

  it.concurrent.each([...pins])('%s matches its pinned SHA-256', async (asset, pinned) => {
    expect(await downloadSha256(`${RELEASE_BASE_URL}/v${version}/${asset}`)).toBe(pinned);
  }, 180_000);
});
