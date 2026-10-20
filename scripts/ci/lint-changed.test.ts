import { describe, expect, it } from 'vitest';
import { addedDirectives, DIRECTIVE, lintableFiles } from './lint-changed.mjs';

// Built at runtime so this file contains none of the comments it tests.
const directive = `// ${DIRECTIVE}-next-line no-console`;
const blockOpen = ['/', '*'].join('');
const added = (line: string) => ['+++ b/src/lib/a.ts', '@@ -1,0 +1 @@', `+${line}`].join('\n');

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

  it.each([
    `${blockOpen} eslint no-console: "off" */`,
    `${blockOpen}eslint no-console:0*/`,
    `const a = 1; ${blockOpen} eslint @typescript-eslint/no-explicit-any: ["warn"] */`,
    `${blockOpen} eslint`,
    `${blockOpen} eslint max-len: ["error", { "code": 500 }] */`,
  ])('finds an added inline rule config: %s', (line) => {
    expect(addedDirectives(added(line))).toEqual(['src/lib/a.ts:1']);
  });

  it.each(['// eslint runs in CI', `${blockOpen}* eslint-friendly helpers */`, `${blockOpen} eslintrc is gone */`])(
    'leaves a comment that only mentions eslint: %s',
    (line) => {
      expect(addedDirectives(added(line))).toEqual([]);
    },
  );

  it('ignores a diff that only removes directives', () => {
    expect(addedDirectives(['+++ b/src/x.ts', '@@ -3 +2,0 @@', `-${directive}`].join('\n'))).toEqual([]);
  });

  it('lints only existing JavaScript and TypeScript files', () => {
    const files = ['a.ts', 'b.tsx', 'c.mjs', 'd.cjs', 'e.js', 'f.md', 'g.json', 'gone.ts'];
    expect(lintableFiles(files, (file: string) => file !== 'gone.ts')).toEqual(['a.ts', 'b.tsx', 'c.mjs', 'd.cjs', 'e.js']);
  });
});
