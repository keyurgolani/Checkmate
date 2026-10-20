import { describe, expect, it } from 'vitest';
import { addedDirectives, DIRECTIVE, lintableFiles } from './lint-changed.mjs';

// Built from the exported token so this file doesn't contain the directive itself.
const directive = `// ${DIRECTIVE}-next-line no-console`;

describe('lint-changed', () => {
  it('finds a directive on an added line, with its new line number', () => {
    const diff = [
      'diff --git a/src/lib/a.ts b/src/lib/a.ts',
      '--- a/src/lib/a.ts',
      '+++ b/src/lib/a.ts',
      '@@ -10,0 +11,2 @@',
      '+const kept = 1;',
      `+${directive}`,
      '@@ -40 +42 @@',
      `-${directive}`,
      '+const replaced = 2;',
    ].join('\n');
    expect(addedDirectives(diff)).toEqual(['src/lib/a.ts:12']);
  });

  it('ignores a diff that only removes directives', () => {
    expect(addedDirectives(['+++ b/src/x.ts', '@@ -3 +2,0 @@', `-${directive}`].join('\n'))).toEqual([]);
  });

  it('lints only existing JavaScript and TypeScript files', () => {
    const files = ['a.ts', 'b.tsx', 'c.mjs', 'd.cjs', 'e.js', 'f.md', 'g.json', 'gone.ts'];
    expect(lintableFiles(files, (file: string) => file !== 'gone.ts')).toEqual(['a.ts', 'b.tsx', 'c.mjs', 'd.cjs', 'e.js']);
  });
});
