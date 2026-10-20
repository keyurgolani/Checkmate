/**
 * CHECKMATE-01.2 · envelope (#30), test plan item 7: the forms the source
 * scan reads, on in-memory route files.
 */

import { beforeAll, describe, expect, it } from 'vitest';
import { ANY_METHOD, scanErrorCodes, type ErrorCodeScan } from './error-code-scan';

const PRELUDE = `
declare function apiError(code: string, message: string, status: number): Response;
declare const NextResponse: { json(body: unknown, init?: { status?: number }): Response };
declare function jsonResponseWithAuth<T>(data: T, authData: unknown, status?: number): Response;
declare function jsonResponseWithLogout<T>(data: T, status?: number): Response;
declare function withAuth(options: object, handler: () => Promise<Response>): () => Promise<Response>;
const FixtureErrorCodes = { A: 'FIX_001', B: 'FIX_002', C: 'FIX_003', UNKNOWN: 'FIX_999' } as const;
type FixtureErrorCode = (typeof FixtureErrorCodes)[keyof typeof FixtureErrorCodes];
declare const result: { error: { code: FixtureErrorCode; message: string } };
`;

const route = (name: string) => `src/app/api/${name}/route.ts`;

const SOURCES: Record<string, string> = {
  [route('default-arm')]: `${PRELUDE}
function statusFor(code: FixtureErrorCode): number {
  switch (code) {
    case FixtureErrorCodes.A: return 400;
    default: return 418;
  }
}
export function GET() { return apiError(result.error.code, 'x', statusFor(result.error.code)); }
`,
  [route('braced')]: `${PRELUDE}
function statusFor(code: FixtureErrorCode): number {
  switch (code) {
    case FixtureErrorCodes.A: { return 409; }
    default: { return 500; }
  }
}
export function GET() { return apiError(result.error.code, 'x', statusFor(result.error.code)); }
`,
  [route('fall-through')]: `${PRELUDE}
function statusFor(code: FixtureErrorCode): number {
  switch (code) {
    case FixtureErrorCodes.A: return 400;
    case FixtureErrorCodes.B:
    default: return 503;
  }
}
export async function PUT() {
  const statusCode = statusFor(result.error.code);
  return NextResponse.json({ success: false, error: { code: result.error.code, message: 'x' } }, { status: statusCode });
}
`,
  [route('trailing-return')]: `${PRELUDE}
function statusFor(code: FixtureErrorCode): number {
  switch (code) {
    case FixtureErrorCodes.A: return 400;
  }
  return 500;
}
export function DELETE() { return apiError(result.error.code, 'x', statusFor(result.error.code)); }
`,
  // Type errors here don't matter to the scan: the switch leaves three codes without a status.
  [route('no-status')]: `${PRELUDE}
function statusFor(code: FixtureErrorCode): number {
  switch (code) {
    case FixtureErrorCodes.A: return 400;
  }
}
declare const loose: { error: { code: string } };
export function GET() { return apiError(result.error.code, 'x', statusFor(result.error.code)); }
export function POST() { return apiError(loose.error.code, 'x', 500); }
`,
  [route('helpers')]: `${PRELUDE}
type Relayed = { relay: false; result: { success: boolean; error?: { code: 'FIX_006' | 'FIX_007'; message: string } | null } };
declare const relayed: Relayed;
function notFound() { return apiError('FIX_008', 'x', 404); }
export function GET() { return notFound(); }
export function POST() { return jsonResponseWithLogout({ success: false, error: { code: 'FIX_004', message: 'x' } }, 403); }
export function PUT() { return jsonResponseWithAuth({ success: false, error: { code: 'FIX_005', message: 'x' } }, {}); }
export function PATCH() { return NextResponse.json(relayed); }
export const DELETE = withAuth({ unauthorizedCode: 'FIX_009', unknownCode: 'FIX_010' }, async () => NextResponse.json({}));
`,
  'src/app/(fixture)/actions.ts': `'use server';
export async function save() { return { success: false, error: 'Not authenticated' }; }
export async function saveAll() { return { success: false, errors: ['one failed'] }; }
export async function remove() { return { success: false, error: { code: 'FIX_011', message: 'x' } }; }
`,
};

let scan: ErrorCodeScan;

beforeAll(() => {
  scan = scanErrorCodes({ sources: SOURCES });
}, 120_000);

function sent(name: string): string[] {
  return scan.sent
    .filter((site) => site.file === route(name))
    .map((site) => `${site.method} ${site.code} ${site.status}`)
    .sort();
}

describe('status switches', () => {
  it('give the default arm status to every code no case lists', () => {
    expect(sent('default-arm')).toEqual(['GET FIX_001 400', 'GET FIX_002 418', 'GET FIX_003 418', 'GET FIX_999 418']);
  });

  it('read a braced case clause', () => {
    expect(sent('braced')).toEqual(['GET FIX_001 409', 'GET FIX_002 500', 'GET FIX_003 500', 'GET FIX_999 500']);
  });

  it('give a case that falls through into default the default status, through a status constant', () => {
    expect(sent('fall-through')).toEqual(['PUT FIX_001 400', 'PUT FIX_002 503', 'PUT FIX_003 503', 'PUT FIX_999 503']);
  });

  it('take a return after the switch as the status for unlisted codes', () => {
    expect(sent('trailing-return')).toEqual(['DELETE FIX_001 400', 'DELETE FIX_002 500', 'DELETE FIX_003 500', 'DELETE FIX_999 500']);
  });
});

describe('unresolved responses', () => {
  it('flag codes a status function leaves without a status, and a code that is not a fixed set', () => {
    const unresolved = scan.unresolved.filter((site) => site.file === route('no-status')).map((site) => site.reason);

    expect(sent('no-status')).toEqual(['GET FIX_001 400']);
    expect(unresolved).toEqual([
      'no fixed status for FIX_002',
      'no fixed status for FIX_003',
      'no fixed status for FIX_999',
      'code is not a fixed set of values',
    ]);
  });
});

describe('response helpers and bodies', () => {
  it('check the status a JSON helper sends, 200 when it takes none', () => {
    expect(sent('helpers')).toEqual(
      expect.arrayContaining(['POST FIX_004 403', 'PUT FIX_005 200'])
    );
  });

  it('read codes from a typed body sent as is', () => {
    expect(sent('helpers')).toEqual(expect.arrayContaining(['PATCH FIX_006 200', 'PATCH FIX_007 200']));
  });

  it('key a send outside a route handler to any method, and withAuth options to their handler', () => {
    expect(sent('helpers')).toEqual(
      expect.arrayContaining([`${ANY_METHOD} FIX_008 404`, 'DELETE FIX_009 401', 'DELETE FIX_010 500'])
    );
  });
});

describe('codeless error bodies', () => {
  it('find server action results whose error or errors carry no code', () => {
    const codeless = scan.codeless.filter((body) => body.file === 'src/app/(fixture)/actions.ts').map((body) => body.reason);

    expect(codeless).toEqual(['error has no code', 'errors have no code']);
  });
});
