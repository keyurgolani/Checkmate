/**
 * Error bodies under src/app that carry no code, per file: a route response
 * or server action result whose `error` or `errors` has no `code`, or that
 * says `success: false` with no error at all.
 *
 * This is the merge-time list of CHECKMATE-01.2 · envelope (#30). #91
 * (CHECKMATE-21.3) owns it and moves these onto the envelope, so it only
 * shrinks: error-codes.test.ts fails when a file's count differs from its
 * entry here, or when an entry goes above its count at merge time.
 */
export const CODELESS_ERROR_BODIES: Readonly<Record<string, number>> = {
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
