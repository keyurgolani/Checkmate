import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { growth, parseCounts, SHRINKING_LISTS } from './check-shrinking-lists.mjs';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

describe('check-shrinking-lists', () => {
  it('reads one count per entry line', () => {
    const text = [
      'export const LIST: Readonly<Record<string, number>> = {',
      "  'src/app/a/route.ts': 4,",
      "  'src/app/(group)/[id]/actions.ts': 16",
      '};',
    ].join('\n');

    expect(parseCounts(text)).toEqual({ 'src/app/a/route.ts': 4, 'src/app/(group)/[id]/actions.ts': 16 });
  });

  it('allows lowering and dropping entries', () => {
    expect(growth({ a: 4, b: 2 }, { a: 3 })).toEqual([]);
    expect(growth({ a: 4 }, { a: 4 })).toEqual([]);
  });

  it('fails a raised count or an added entry', () => {
    expect(growth({ a: 4 }, { a: 5, b: 1 })).toEqual(['a: 4 raised to 5', 'b: added with 1']);
  });

  it('reads every listed file as a non-empty list', () => {
    for (const file of SHRINKING_LISTS) {
      expect(existsSync(path.join(REPO_ROOT, file)), file).toBe(true);
      expect(Object.keys(parseCounts(readFileSync(path.join(REPO_ROOT, file), 'utf8'))).length, file).toBeGreaterThan(0);
    }
  });
});
