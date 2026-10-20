/**
 * CHECKMATE-01.2 · envelope (#30), test plan item 7: the registry, the
 * legacy map, and a scan of src/ that keeps both in step with the code.
 * error-envelope.test.ts covers the helper, and src/test/error-code-scan.test.ts
 * the forms the scan reads.
 */

import { existsSync } from 'node:fs';
import { STATUS_CODES } from 'node:http';
import path from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';
import { REPO_ROOT, scanErrorCodes, type ErrorCodeScan } from '@/test/error-code-scan';
import { CODELESS_ERROR_BODIES } from './codeless-error-bodies';
import {
  ERROR_CODES,
  LEGACY_CODE_MAP,
  isOutcomeCode,
  isRegistryCode,
  mapLegacyCode,
  reservedFor,
  type CodeSpec,
  type RegistryCode,
} from './error-codes';

const CODES = Object.keys(ERROR_CODES) as RegistryCode[];
const REGISTRY: Readonly<Record<string, CodeSpec | undefined>> = ERROR_CODES;

/** #30's denial semantics: one status per code, and the leaf that registers it. */
const DENIAL_SEMANTICS: ReadonlyArray<readonly [code: string, status: number, leaf: string]> = [
  ['VALIDATION_FAILED', 400, '01.2'],
  ['AUTH_REQUIRED', 401, '01.2'],
  ['SESSION_EXPIRED', 401, '02.1'],
  ['SESSION_REVOKED', 401, '02.1'],
  ['SESSION_LEGACY', 401, '02.1'],
  ['REAUTH_REQUIRED', 401, '02.1'],
  ['FORBIDDEN', 403, '01.2'],
  ['CSRF_REJECTED', 403, '02.1'],
  ['NOT_FOUND', 404, '01.2'],
  ['CAPABILITY_INVALID', 404, '01.2'],
  ['RATE_LIMITED', 429, '01.2'],
  ['POLICY_UNAVAILABLE', 503, '01.2'],
];

/** Codes the public issues of #25, #26, #28 and #81 define, with the leaf each waits for. */
const WAVE_0_CODES: ReadonlyArray<readonly [code: string, status: number, leaf: string]> = [
  ['ACCESS_ALREADY_GRANTED', 409, '00.1'],
  ['SERVER_IDENTITY_UNAVAILABLE', 503, '00.1'],
  ['SECRET_NOT_ACCEPTED', 400, '00.2'],
  ['EGRESS_DENIED', 403, '00.2'],
  ['CREDENTIAL_ENDPOINT_CHANGED', 409, '00.2'],
  ['CREDENTIAL_UNAVAILABLE', 409, '00.2'],
  ['CREDENTIAL_STORE_UNAVAILABLE', 503, '00.2'],
  ['CONFIG_001', 503, '00.4'],
  ['CONFIG_002', 503, '00.4'],
  ['CONFIG_003', 503, '00.4'],
  ['CONFIG_004', 503, '00.4'],
  ['CONFIG_005', 503, '00.4'],
  ['WORKSPACE_FORBIDDEN', 403, '18.2'],
  ['SCHEMA_INCOMPATIBLE', 503, '18.2'],
  ['SCHEMA_HEAD_UNAVAILABLE', 503, '18.2'],
];

const LEGACY_CODES = new Set(LEGACY_CODE_MAP.map((use) => use.code));

function uniqueSorted(values: Iterable<string>): string[] {
  return [...new Set(values)].sort();
}

function sentKey(use: { file: string; method: string | null; code: string; status: number | null }): string {
  return `${use.file} ${use.method} ${use.code} ${use.status}`;
}

describe('registry', () => {
  it('gives every code one real HTTP status of its kind, and its copy', () => {
    const malformed = CODES.flatMap((code) => {
      const { status, message } = ERROR_CODES[code];
      const problems: string[] = [];
      if (!/^[A-Z][A-Z0-9_]*$/.test(code)) problems.push('name is not UPPER_SNAKE');
      if (STATUS_CODES[status] === undefined) problems.push(`status ${status} is not an HTTP status`);
      if (!isOutcomeCode(code) && (status < 400 || status > 599)) problems.push(`error code with status ${status}`);
      if (!/^\S.*\.$/.test(message) || /[\u2013\u2014]/.test(message)) problems.push(`copy "${message}"`);
      return problems.map((problem) => `${code}: ${problem}`);
    });

    expect(malformed).toEqual([]);
  });

  it('registers each denial code this slice owns with its status, and pins the status of the rest', () => {
    for (const [code, status, leaf] of DENIAL_SEMANTICS) {
      const registered = REGISTRY[code]?.status;
      if (leaf === '01.2') {
        expect(registered, code).toBe(status);
      } else {
        // #32 (CHECKMATE-02.1, sessions) registers these; when it does, the status must hold.
        expect([undefined, status], code).toContain(registered);
      }
    }
  });

  it('answers a failed policy lookup with 503, never 404', () => {
    expect(ERROR_CODES.POLICY_UNAVAILABLE.status).toBe(503);
  });

  it('registers the codes the Wave 0 issues define at their statuses, reserved until each leaf sends them', () => {
    for (const [code, status, leaf] of WAVE_0_CODES) {
      expect(REGISTRY[code]?.status, code).toBe(status);
      expect([leaf, undefined], code).toContain(REGISTRY[code]?.reservedFor);
    }
    expect(ERROR_CODES.SIGNUP_DISABLED.status).toBe(403);
    expect(reservedFor('SIGNUP_DISABLED')).toBeUndefined();
  });
});

describe('legacy map', () => {
  it('keys each use by (legacy code, status, returning file, method), with reasons only where one key has two meanings', () => {
    const byKey = new Map<string, Array<string | undefined>>();
    for (const use of LEGACY_CODE_MAP) byKey.set(sentKey(use), [...(byKey.get(sentKey(use)) ?? []), use.reason]);
    const malformed = [...byKey].filter(([, reasons]) =>
      reasons.length === 1 ? reasons[0] !== undefined : reasons.some((reason) => !reason) || new Set(reasons).size !== reasons.length
    );

    expect(malformed).toEqual([]);
  });

  it('maps each use to a registered error code a route may send now', () => {
    const unmapped = LEGACY_CODE_MAP.filter((use) => !isRegistryCode(use.to) || isOutcomeCode(use.to) || reservedFor(use.to));

    expect(unmapped).toEqual([]);
  });

  it('gives each sent use a real HTTP status and a method, and names files that exist', () => {
    const malformed = LEGACY_CODE_MAP.filter((use) =>
      use.status === null ? use.method !== null : STATUS_CODES[use.status] === undefined || !use.method
    );
    const missing = uniqueSorted(LEGACY_CODE_MAP.map((use) => use.file)).filter(
      (file) => !existsSync(path.join(REPO_ROOT, file))
    );

    expect(malformed).toEqual([]);
    expect(missing).toEqual([]);
  });

  it('tells apart the uses of one legacy code', () => {
    const templates = 'src/app/api/templates/[id]/route.ts';
    const collaborators = 'src/app/api/templates/[id]/collaborators/route.ts';
    const reset = 'src/app/api/auth/reset-password/route.ts';

    expect(mapLegacyCode({ code: 'TEMPLATE_003', status: 401, file: templates, method: 'PUT' })).toBe('AUTH_REQUIRED');
    expect(mapLegacyCode({ code: 'TEMPLATE_003', status: 403, file: templates, method: 'PUT' })).toBe('FORBIDDEN');
    expect(mapLegacyCode({ code: 'AUTH_001', status: 401, file: 'src/app/api/auth/signin/route.ts', method: 'POST' })).toBe('AUTH_001');
    expect(mapLegacyCode({ code: 'AUTH_001', status: 401, file: 'src/app/api/llm/models/route.ts', method: 'POST' })).toBe('AUTH_REQUIRED');
    expect(mapLegacyCode({ code: 'COLLAB_004', status: 403, file: collaborators, method: 'GET' })).toBe('NOT_FOUND');
    expect(mapLegacyCode({ code: 'COLLAB_004', status: 403, file: collaborators, method: 'POST' })).toBe('FORBIDDEN');
    expect(mapLegacyCode({ code: 'TEMPLATE_003', status: 403, file: 'src/app/api/templates/[id]/copy/route.ts', method: 'POST' })).toBe('NOT_FOUND');
    expect(mapLegacyCode({ code: 'AUTH_006', status: 400, file: reset, method: 'POST', reason: 'invalid input' })).toBe('VALIDATION_FAILED');
    expect(mapLegacyCode({ code: 'AUTH_006', status: 400, file: reset, method: 'POST', reason: 'reset token rejected' })).toBe('CAPABILITY_INVALID');
    expect(mapLegacyCode({ code: 'IMPORT_009', status: 400, file: 'src/app/api/templates/import/route.ts', method: 'POST' })).toBe('UNSUPPORTED_VERSION');
    expect(mapLegacyCode({ code: 'AUTH_004', status: 401, file: 'src/proxy.ts', method: '*' })).toBe('AUTH_REQUIRED');
    expect(mapLegacyCode({ code: 'NOTIF_001', status: null, file: 'src/lib/services/notification.ts', method: null })).toBe('NOT_FOUND');
  });

  it('returns nothing for a use it does not list, or a two-meaning use without its reason', () => {
    const templates = 'src/app/api/templates/[id]/route.ts';

    expect(mapLegacyCode({ code: 'TEMPLATE_003', status: 418, file: templates, method: 'PUT' })).toBeUndefined();
    expect(mapLegacyCode({ code: 'TEMPLATE_003', status: 403, file: templates, method: 'GET' })).toBeUndefined();
    expect(mapLegacyCode({ code: 'NOT_A_CODE', status: 400, file: 'src/proxy.ts', method: '*' })).toBeUndefined();
    expect(mapLegacyCode({ code: 'AUTH_006', status: 400, file: 'src/app/api/auth/reset-password/route.ts', method: 'POST' })).toBeUndefined();
  });
});

describe('source scan', () => {
  let scan: ErrorCodeScan;

  beforeAll(() => {
    scan = scanErrorCodes();
  }, 120_000);

  it('registers every *ErrorCodes member and literal error code in src/, in the registry or the legacy map', () => {
    expect(scan.members.length).toBeGreaterThan(0);
    const unregistered = uniqueSorted([...scan.members, ...scan.literals].map((site) => site.code)).filter(
      (code) => !LEGACY_CODES.has(code) && !isRegistryCode(code)
    );

    expect(unregistered).toEqual([]);
  });

  it('pins down the code and status of every response a route or the proxy sends', () => {
    expect(scan.unresolved.map(({ file, line, reason }) => `${file}:${line} ${reason}`)).toEqual([]);
  });

  it('maps every response that sends a code, by method and status', () => {
    expect(scan.sent.length).toBeGreaterThan(0);
    const listed = new Set(LEGACY_CODE_MAP.filter((use) => use.status !== null).map(sentKey));
    const unmapped = scan.sent
      .filter((site) => {
        if (listed.has(sentKey(site))) return false;
        return !(isRegistryCode(site.code) && ERROR_CODES[site.code].status === site.status);
      })
      .map(({ code, status, file, line, method, via }) => `${file}:${line} ${method} sends ${code} with ${status} (${via})`);

    expect(unmapped).toEqual([]);
  });

  it('keeps no legacy row that no response sends, or that the file no longer produces', () => {
    const sent = new Set(scan.sent.map(sentKey));
    const sentCodes = new Set(scan.sent.map((site) => site.code));
    const produced = new Set([...scan.members, ...scan.literals].map((site) => `${site.code} ${site.file}`));
    const stale = LEGACY_CODE_MAP.filter((use) =>
      use.status === null ? !produced.has(`${use.code} ${use.file}`) || sentCodes.has(use.code) : !sent.has(sentKey(use))
    ).map((use) => `${sentKey(use)}${use.reason ? ` (${use.reason})` : ''}`);

    expect(stale).toEqual([]);
  });

  it('sends no reserved code, and leaves no other registered code unused', () => {
    const used = new Set([
      ...LEGACY_CODE_MAP.map((use) => use.to),
      ...scan.envelope.map((site) => site.code),
      ...scan.sent.map((site) => site.code),
    ]);
    const problems = CODES.flatMap((code) => {
      const leaf = reservedFor(code);
      if (leaf && used.has(code)) return [`${code} is reserved for ${leaf} but already sent; drop the reservation`];
      if (!leaf && !used.has(code)) return [`${code} is registered but nothing sends or maps to it; reserve it for its leaf`];
      return [];
    });

    expect(problems).toEqual([]);
  });

  it('fails on a codeless error body under src/app unless #91 (CHECKMATE-21.3) lists it', () => {
    const found: Record<string, number> = {};
    for (const body of scan.codeless) found[body.file] = (found[body.file] ?? 0) + 1;

    expect(found, 'Return the error-envelope.ts body, or lower codeless-error-bodies.ts when one goes').toEqual(
      CODELESS_ERROR_BODIES
    );
  });
});
