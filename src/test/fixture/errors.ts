/**
 * Named fixture errors. Every error carries a code that CI logs can match
 * and a fix line that tells a developer what to do next.
 */

export type FixtureErrorCode =
  | 'FIXTURE_UNSUPPORTED_PLATFORM'
  | 'FIXTURE_DOWNLOAD_FAILED'
  | 'FIXTURE_CHECKSUM_MISMATCH'
  | 'FIXTURE_PORT_IN_USE'
  | 'FIXTURE_START_TIMEOUT'
  | 'FIXTURE_START_FAILED'
  | 'FIXTURE_SCHEMA_FAILED';

export class FixtureError extends Error {
  readonly code: FixtureErrorCode;
  readonly fix: string;

  constructor(code: FixtureErrorCode, detail: string, fix: string) {
    super(`${code}: ${detail}\n  fix: ${fix}`);
    this.name = 'FixtureError';
    this.code = code;
    this.fix = fix;
  }
}

export function isFixtureError(error: unknown, code?: FixtureErrorCode): error is FixtureError {
  return error instanceof FixtureError && (code === undefined || error.code === code);
}
