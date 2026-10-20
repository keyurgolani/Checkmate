import { describe, expect, it } from 'vitest';
import { evaluateJobIf, parse } from './lib/expression.mjs';

function context(success = true) {
  return {
    github: { event_name: 'push', ref: 'refs/heads/next' },
    vars: { FLAG: 'True' },
    needs: { build: { result: 'success' } },
    status: { success: () => success, failure: () => !success, cancelled: () => false, always: () => true },
  };
}

describe('expression', () => {
  it('compares strings without regard to case, like GitHub', () => {
    expect(evaluateJobIf("vars.FLAG == 'true'", context())).toBe(true);
    expect(evaluateJobIf("${{ startsWith(github.ref, 'REFS/heads/') }}", context())).toBe(true);
  });

  it('adds the implicit success() check, unless a status function is used', () => {
    expect(evaluateJobIf("github.event_name == 'push'", context(false))).toBe(false);
    expect(evaluateJobIf("always() && github.event_name == 'push'", context(false))).toBe(true);
  });

  it('binds && tighter than ||, and ! tightest', () => {
    expect(evaluateJobIf("github.event_name == 'pull_request' && false || needs.build.result == 'success'", context())).toBe(true);
    expect(evaluateJobIf("!(github.event_name == 'push') || false", context())).toBe(false);
  });

  it('reads a missing context value as empty', () => {
    expect(evaluateJobIf("vars.UNSET == ''", context())).toBe(true);
    expect(evaluateJobIf("vars.UNSET == 'true'", context())).toBe(false);
  });

  it('parses an object filter but does not evaluate one', () => {
    expect(() => parse('github.event.commits.*.message')).not.toThrow();
    expect(() => evaluateJobIf("github.event.commits.*.message == 'x'", context())).toThrow('object filters');
  });

  it('rejects syntax it does not support', () => {
    expect(() => parse("github.ref =~ 'refs/tags/'")).toThrow(SyntaxError);
    expect(() => parse("format('{0}', github.ref) == 'x'")).not.toThrow();
    expect(() => evaluateJobIf("format('{0}', github.ref) == 'x'", context())).toThrow('unsupported function format()');
  });
});
