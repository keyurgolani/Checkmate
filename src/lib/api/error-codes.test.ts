/**
 * CHECKMATE-01.2 · envelope (#30), test plan item 7: the registry, the
 * legacy map, and a scan of src/ that keeps both in step with the code.
 * error-envelope.test.ts covers the helper half of item 7.
 */

import { existsSync } from 'node:fs';
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

/** Codeless error bodies per file when `· envelope` merged. #91's list may only go below these. */
const MERGE_TIME_CODELESS: Readonly<Record<string, number>> = {
  'src/app/(dashboard)/checklists/[id]/actions.ts': 4,
  'src/app/(dashboard)/checklists/actions.ts': 4,
  'src/app/(dashboard)/discover/actions.ts': 4,
  'src/app/(dashboard)/settings/actions.ts': 4,
  'src/app/(dashboard)/templates/actions.ts': 8,
  'src/app/(dashboard)/workspaces/[id]/actions.ts': 8,
  'src/app/(dashboard)/workspaces/actions.ts': 16,
  'src/app/api/auth/demo-reset/route.ts': 2,
  'src/app/api/auth/signout/route.ts': 1,
  'src/app/api/dashboard/summary/route.ts': 7,
  'src/app/api/setup/route.ts': 3,
  'src/app/api/templates/request-access/route.ts': 7,
};

const LEGACY_CODES = new Set(LEGACY_CODE_MAP.map((use) => use.code));

function uniqueSorted(values: Iterable<string>): string[] {
  return [...new Set(values)].sort();
}

describe('registry', () => {
  it('gives every code one status and its copy', () => {
    const malformed = CODES.flatMap((code) => {
      const { status, message } = ERROR_CODES[code];
      const problems: string[] = [];
      if (!/^[A-Z][A-Z0-9_]*$/.test(code)) problems.push('name is not UPPER_SNAKE');
      if (!Number.isInteger(status)) problems.push(`status ${status} is not an integer`);
      if (isOutcomeCode(code) ? status >= 300 : status < 400 || status > 599) problems.push(`status ${status}`);
      if (!/^\S.*\.$/.test(message) || /[\u2013\u2014]/.test(message)) problems.push(`copy "${message}"`);
      return problems.map((problem) => `${code}: ${problem}`);
    });

    expect(new Set(CODES).size).toBe(CODES.length);
    expect(malformed).toEqual([]);
  });

  it('registers each denial code this slice owns with its status, and pins the status of the rest', () => {
    for (const [code, status, leaf] of DENIAL_SEMANTICS) {
      const registered = REGISTRY[code]?.status;
      if (leaf === '01.2') {
        expect(registered, code).toBe(status);
      } else {
        // #32 (CHECKMATE-02.1) registers these; when it does, the status must hold.
        expect([undefined, status], code).toContain(registered);
      }
    }
  });

  it('answers a failed policy lookup with 503, never 404', () => {
    expect(ERROR_CODES.POLICY_UNAVAILABLE.status).toBe(503);
  });

  it('keeps outcome codes on 2xx, starting with UNCHANGED', () => {
    expect(CODES.filter(isOutcomeCode)).toEqual(['UNCHANGED']);
    expect(ERROR_CODES.UNCHANGED.status).toBe(200);
  });
});

describe('legacy map', () => {
  it('keys each use by (legacy code, status, returning file) once', () => {
    const keys = LEGACY_CODE_MAP.map((use) => `${use.code} ${use.status} ${use.file}`);
    const duplicates = keys.filter((key, index) => keys.indexOf(key) !== index);

    expect(duplicates).toEqual([]);
  });

  it('maps each use to a registered error code', () => {
    const unmapped = LEGACY_CODE_MAP.filter((use) => !isRegistryCode(use.to) || isOutcomeCode(use.to));

    expect(unmapped).toEqual([]);
  });

  it('names files that exist', () => {
    const missing = uniqueSorted(LEGACY_CODE_MAP.map((use) => use.file)).filter(
      (file) => !existsSync(path.join(REPO_ROOT, file))
    );

    expect(missing).toEqual([]);
  });

  it('tells apart the uses of one legacy code', () => {
    expect(mapLegacyCode('TEMPLATE_003', 401, 'src/app/api/templates/[id]/route.ts')).toBe('AUTH_REQUIRED');
    expect(mapLegacyCode('TEMPLATE_003', 403, 'src/app/api/templates/[id]/route.ts')).toBe('FORBIDDEN');
    expect(mapLegacyCode('AUTH_001', 401, 'src/app/api/auth/signin/route.ts')).toBe('AUTH_001');
    expect(mapLegacyCode('AUTH_001', 401, 'src/app/api/llm/models/route.ts')).toBe('AUTH_REQUIRED');
    expect(mapLegacyCode('COLLAB_001', 500, 'src/app/api/collaborators/[id]/accept/route.ts')).toBe('NOT_FOUND');
    expect(mapLegacyCode('IMPORT_009', 400, 'src/app/api/templates/import/route.ts')).toBe('UNSUPPORTED_VERSION');
    expect(mapLegacyCode('NOTIF_001', null, 'src/lib/services/notification.ts')).toBe('NOT_FOUND');
  });

  it('returns nothing for a use it does not list', () => {
    expect(mapLegacyCode('TEMPLATE_003', 418, 'src/app/api/templates/[id]/route.ts')).toBeUndefined();
    expect(mapLegacyCode('TEMPLATE_003', 403, 'src/app/api/items/[id]/route.ts')).toBeUndefined();
    expect(mapLegacyCode('NOT_A_CODE', 400, 'src/proxy.ts')).toBeUndefined();
  });
});

describe('source scan', () => {
  let scan: ErrorCodeScan;

  beforeAll(() => {
    scan = scanErrorCodes();
  }, 120_000);

  it('finds the codes it scans for', () => {
    expect(scan.members.length).toBeGreaterThan(0);
    expect(scan.literals.length).toBeGreaterThan(0);
    expect(scan.sent.length).toBeGreaterThan(0);
  });

  it('registers every *ErrorCodes member and literal error code in src/, in the registry or the legacy map', () => {
    const unregistered = uniqueSorted([...scan.members, ...scan.literals].map((site) => site.code)).filter(
      (code) => !LEGACY_CODES.has(code) && !isRegistryCode(code)
    );

    expect(unregistered).toEqual([]);
  });

  it('keeps no legacy entry for a code src/ no longer has', () => {
    const present = new Set([...scan.members, ...scan.literals].map((site) => site.code));
    const stale = uniqueSorted(LEGACY_CODES).filter((code) => !present.has(code));

    expect(stale).toEqual([]);
  });

  it('maps every response that pairs a fixed code with a fixed status', () => {
    const unmapped = scan.sent
      .filter(({ code, status, file }) => {
        if (mapLegacyCode(code, status, file) !== undefined) return false;
        return !(isRegistryCode(code) && ERROR_CODES[code].status === status);
      })
      .map(({ code, status, file, line, via }) => `${file}:${line} sends ${code} with ${status} (${via})`);

    expect(unmapped).toEqual([]);
  });

  it('lists a code as in process only where it is produced and no response sends it', () => {
    const inProcess = LEGACY_CODE_MAP.filter((use) => use.status === null);
    const produced = new Set([...scan.members, ...scan.literals].map((site) => `${site.code} ${site.file}`));
    const sentCodes = new Set(scan.sent.map((site) => site.code));
    const sentWithStatus = new Set(LEGACY_CODE_MAP.filter((use) => use.status !== null).map((use) => use.code));

    expect(inProcess.length).toBeGreaterThan(0);
    expect(inProcess.filter((use) => !produced.has(`${use.code} ${use.file}`))).toEqual([]);
    expect(inProcess.filter((use) => sentCodes.has(use.code) || sentWithStatus.has(use.code))).toEqual([]);
  });

  it('fails on a codeless error body under src/app unless #91 list allows it, and the list only shrinks', () => {
    const found: Record<string, number> = {};
    for (const body of scan.codeless) found[body.file] = (found[body.file] ?? 0) + 1;

    const grown = Object.entries(CODELESS_ERROR_BODIES)
      .filter(([file, count]) => count > (MERGE_TIME_CODELESS[file] ?? 0))
      .map(([file, count]) => `${file}: ${count} is above its merge-time ${MERGE_TIME_CODELESS[file] ?? 0}`);

    expect(grown).toEqual([]);
    expect(found).toEqual(CODELESS_ERROR_BODIES);
  });
});
