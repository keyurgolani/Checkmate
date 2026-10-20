/**
 * The files the source scans read: .ts and .tsx files under src/, without
 * test code, repo-relative with forward slashes. error-code-scan.ts and
 * legacy-name-scan.ts share it.
 */

import { readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

/** Test code: anything under src/test/, and `*.test.ts(x)` and `*.typetest.ts` files. */
export function isTestFile(file: string): boolean {
  return file.startsWith('src/test/') || /\.(?:test|typetest)\.tsx?$/.test(file);
}

export interface SourceFileOptions {
  /** Include `.d.ts` files. */
  readonly declarations?: boolean;
}

/** Non-test .ts and .tsx files under src/, sorted. */
export function sourceFiles(options: SourceFileOptions = {}): string[] {
  return readdirSync(path.join(REPO_ROOT, 'src'), { recursive: true, encoding: 'utf8' })
    .map((entry) => path.posix.join('src', entry.split(path.sep).join('/')))
    .filter((file) => /\.tsx?$/.test(file) && !isTestFile(file) && (options.declarations === true || !file.endsWith('.d.ts')))
    .sort();
}
