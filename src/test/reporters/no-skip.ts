/**
 * Fails a CI run that skips any test or leaves a todo, so a suite can't
 * pass by not running. Local runs only list them.
 */

import type { Reporter, TestModule, TestRunEndReason } from 'vitest/node';

export function findSkippedTests(testModules: ReadonlyArray<TestModule>): string[] {
  const skipped: string[] = [];
  for (const testModule of testModules) {
    for (const test of testModule.children.allTests()) {
      const todo = test.options.mode === 'todo';
      if (todo || test.result().state === 'skipped') {
        skipped.push(`${testModule.relativeModuleId} > ${test.fullName}${todo ? ' (todo)' : ''}`);
      }
    }
  }
  return skipped;
}

export function isCi(env: Record<string, string | undefined> = process.env): boolean {
  const value = env.CI?.trim().toLowerCase();
  return value !== undefined && value !== '' && value !== 'false' && value !== '0';
}

export default class NoSkipReporter implements Reporter {
  onTestRunEnd(testModules: ReadonlyArray<TestModule>, _errors: unknown, reason: TestRunEndReason): void {
    if (reason === 'interrupted') return;
    const skipped = findSkippedTests(testModules);
    if (skipped.length === 0) return;

    const list = skipped.map((name) => `  - ${name}`).join('\n');
    if (isCi()) {
      process.exitCode = 1;
      console.error(`\nno-skip: CI allows no skipped or todo tests, found ${skipped.length}:\n${list}\n`);
    } else {
      console.warn(`\nno-skip: ${skipped.length} skipped or todo test(s); CI fails on these:\n${list}\n`);
    }
  }
}
