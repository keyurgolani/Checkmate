/**
 * Minimal zip reader: returns one entry from an archive held in memory.
 * PocketBase release zips use deflate and stay far below the zip64 limits,
 * so this avoids depending on an `unzip` binary in minimal containers.
 */

import { crc32, inflateRawSync } from 'node:zlib';

const END_OF_CENTRAL_DIRECTORY = 0x06054b50;
const CENTRAL_DIRECTORY_ENTRY = 0x02014b50;
const LOCAL_FILE_HEADER = 0x04034b50;
const ZIP64_MARKER = 0xffffffff;

export function readZipEntry(zip: Buffer, entryName: string): Buffer {
  const end = findEndOfCentralDirectory(zip);
  const entryCount = zip.readUInt16LE(end + 10);
  let offset = zip.readUInt32LE(end + 16);

  for (let index = 0; index < entryCount; index++) {
    if (offset + 46 > zip.length || zip.readUInt32LE(offset) !== CENTRAL_DIRECTORY_ENTRY) {
      throw new Error('zip central directory is corrupt');
    }
    const method = zip.readUInt16LE(offset + 10);
    const crc = zip.readUInt32LE(offset + 16);
    const compressedSize = zip.readUInt32LE(offset + 20);
    const size = zip.readUInt32LE(offset + 24);
    const nameLength = zip.readUInt16LE(offset + 28);
    const extraLength = zip.readUInt16LE(offset + 30);
    const commentLength = zip.readUInt16LE(offset + 32);
    const localHeader = zip.readUInt32LE(offset + 42);
    const name = zip.toString('utf8', offset + 46, offset + 46 + nameLength);

    if (name === entryName) {
      if (compressedSize === ZIP64_MARKER || size === ZIP64_MARKER) {
        throw new Error(`zip entry ${entryName} uses zip64, which this reader does not support`);
      }
      if (localHeader + 30 > zip.length || zip.readUInt32LE(localHeader) !== LOCAL_FILE_HEADER) {
        throw new Error(`zip entry ${entryName} has a corrupt local header`);
      }
      const dataStart = localHeader + 30 + zip.readUInt16LE(localHeader + 26) + zip.readUInt16LE(localHeader + 28);
      const stored = zip.subarray(dataStart, dataStart + compressedSize);
      let data: Buffer;
      if (method === 0) {
        data = Buffer.from(stored);
      } else if (method === 8) {
        data = inflateRawSync(stored);
      } else {
        throw new Error(`zip entry ${entryName} uses unsupported compression method ${method}`);
      }
      if (data.length !== size || crc32(data) !== crc) {
        throw new Error(`zip entry ${entryName} failed its CRC check`);
      }
      return data;
    }

    offset += 46 + nameLength + extraLength + commentLength;
  }

  throw new Error(`zip has no entry named ${entryName}`);
}

function findEndOfCentralDirectory(zip: Buffer): number {
  // The record is 22 bytes and may be followed by a comment of up to 65535 bytes.
  const lowest = Math.max(0, zip.length - 22 - 0xffff);
  for (let offset = zip.length - 22; offset >= lowest; offset--) {
    if (zip.readUInt32LE(offset) === END_OF_CENTRAL_DIRECTORY) return offset;
  }
  throw new Error('not a zip archive: no end of central directory record');
}
