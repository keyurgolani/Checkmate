import { describe, expect, it } from 'vitest';
import { assetName, parseChecksums } from './binary';
import { isFixtureError } from './errors';
import { zipOf } from './test-zip';
import { readZipEntry } from './zip';

describe('readZipEntry', () => {
  const data = Buffer.from('#!/bin/sh\necho pocketbase\n'.repeat(50));

  it.each([0, 8] as const)('returns an entry stored with method %i', (method) => {
    expect(readZipEntry(zipOf('pocketbase', data, method), 'pocketbase').equals(data)).toBe(true);
  });

  it('rejects a missing entry', () => {
    expect(() => readZipEntry(zipOf('LICENSE.md', data), 'pocketbase')).toThrow('no entry named pocketbase');
  });

  it('rejects bytes that are not a zip', () => {
    expect(() => readZipEntry(Buffer.from('not a zip archive at all'), 'pocketbase')).toThrow('not a zip archive');
  });

  it('rejects an entry whose content fails its CRC', () => {
    const zip = zipOf('pocketbase', data, 0);
    zip.writeUInt8(zip.readUInt8(40) ^ 0xff, 40);
    expect(() => readZipEntry(zip, 'pocketbase')).toThrow('CRC');
  });
});

describe('parseChecksums', () => {
  const hash = 'a'.repeat(64);

  it('reads sha256sum text and binary mode lines', () => {
    const sums = parseChecksums(`${hash}  one.zip\n${'b'.repeat(64)} *two.zip\n\n# comment\n`);
    expect([...sums]).toEqual([
      ['one.zip', hash],
      ['two.zip', 'b'.repeat(64)],
    ]);
  });

  it('rejects a malformed line', () => {
    expect(() => parseChecksums(`${hash} one.zip`)).toThrow('malformed checksum line');
  });
});

describe('assetName', () => {
  it.each([
    ['darwin', 'arm64', 'pocketbase_0.25.9_darwin_arm64.zip'],
    ['darwin', 'x64', 'pocketbase_0.25.9_darwin_amd64.zip'],
    ['linux', 'arm64', 'pocketbase_0.25.9_linux_arm64.zip'],
    ['linux', 'x64', 'pocketbase_0.25.9_linux_amd64.zip'],
  ] as const)('maps %s/%s to %s', (platform, arch, expected) => {
    expect(assetName('0.25.9', platform, arch)).toBe(expected);
  });

  it('names WSL as the Windows fix', () => {
    let caught: unknown;
    try {
      assetName('0.25.9', 'win32', 'x64');
    } catch (error) {
      caught = error;
    }
    expect(isFixtureError(caught, 'FIXTURE_UNSUPPORTED_PLATFORM')).toBe(true);
    expect((caught as Error).message).toContain('WSL');
  });
});
