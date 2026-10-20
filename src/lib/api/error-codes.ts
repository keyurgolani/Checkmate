/**
 * CHECKMATE-01.2 · envelope (#30): the code registry and the legacy map.
 *
 * Every code has one HTTP status, which error-envelope.ts reads. Error codes
 * carry a 4xx or 5xx status. Outcome codes carry a 2xx status and return the
 * success body with a top-level `code`. A leaf registers its own codes here
 * in its PR; error-codes.test.ts fails on an `*ErrorCodes` member or literal
 * error code in src/ that is neither registered nor in the legacy map.
 *
 * The legacy map covers every code that predates the registry. Each use is
 * keyed by (legacy code, status, returning file), so one legacy code can
 * mean different things in different places. Legacy codes keep working
 * through it until #91 (CHECKMATE-21.3) moves routes onto the envelope.
 *
 * docs/architecture/decisions/denial-semantics.md records the decision.
 */

export interface CodeSpec {
  /** The status of every response that carries this code. */
  readonly status: number;
  /** Default copy, used when the caller passes no message. */
  readonly message: string;
}

export const ERROR_CODES = {
  // Outcome codes. #59 (CHECKMATE-11.1) registers the rest of its outcomes.
  UNCHANGED: { status: 200, message: 'Already up to date. Nothing changed.' },

  // Denial semantics, entity-neutral.
  VALIDATION_FAILED: { status: 400, message: 'Some values are invalid. Check them and try again.' },
  AUTH_REQUIRED: { status: 401, message: 'Sign in to continue.' },
  FORBIDDEN: { status: 403, message: "You don't have permission to do that." },
  NOT_FOUND: { status: 404, message: "Not found. It may not exist, or it isn't shared with you." },
  CAPABILITY_INVALID: { status: 404, message: 'This link is invalid, expired or revoked.' },
  RATE_LIMITED: { status: 429, message: 'Too many requests. Wait a moment and try again.' },
  POLICY_UNAVAILABLE: { status: 503, message: "Permissions couldn't be checked right now. Try again." },

  // Codes that legacy codes on `next` map to.
  UNSUPPORTED_VERSION: { status: 400, message: "This file's format version isn't supported." },
  // Wrong password or unknown account. #32 (CHECKMATE-02.1) keeps this code.
  AUTH_001: { status: 401, message: 'Email or password is incorrect.' },
  CONFLICT: { status: 409, message: 'This conflicts with the current state. Refresh and try again.' },
  RUN_SYNC_REMOVED: {
    status: 410,
    message: 'Template sync was removed. A run keeps the steps it was created with.',
  },
  REFERENCE_CYCLE: { status: 422, message: 'This reference would create a loop.' },
  INTERNAL_ERROR: { status: 500, message: 'Something went wrong. Try again.' },
  UPSTREAM_FAILED: { status: 502, message: "A connected service didn't respond as expected. Try again." },
} as const satisfies Record<string, CodeSpec>;

export type RegistryCode = keyof typeof ERROR_CODES;

type StatusOf<C extends RegistryCode> = (typeof ERROR_CODES)[C]['status'];

/** Codes with a 2xx status: the success body with a top-level `code`. */
export type OutcomeCode = {
  [C in RegistryCode]: `${StatusOf<C>}` extends `2${string}` ? C : never;
}[RegistryCode];

/** Codes with a 4xx or 5xx status: the error envelope. */
export type ErrorCode = Exclude<RegistryCode, OutcomeCode>;

export function isRegistryCode(value: string): value is RegistryCode {
  return Object.hasOwn(ERROR_CODES, value);
}

export function isOutcomeCode(code: RegistryCode): code is OutcomeCode {
  const { status } = ERROR_CODES[code];
  return status >= 200 && status < 300;
}

// ============================================================================
// Legacy map
// ============================================================================

/** Legacy code, then the status a response sends it with, then what it means. */
type StatusUses = Readonly<Record<string, Readonly<Record<number, ErrorCode>>>>;

/**
 * Uses a response carries today, by the file that returns the response.
 *
 * `withAuth` sends a route's 403 code with 401, so TEMPLATE_003 means
 * AUTH_REQUIRED at 401 and FORBIDDEN at 403. A route that forwards a
 * service error lists every code that service call can return, under the
 * route's own status mapping, and each maps to what happened. COLLAB_001
 * sent with 500 is still NOT_FOUND. The categories route's 500 for a
 * PocketBase 400 is INTERNAL_ERROR, since that route takes no input.
 */
const SENT: Readonly<Record<string, StatusUses>> = {
  'src/proxy.ts': {
    AUTH_004: { 401: 'AUTH_REQUIRED' },
  },
  'src/app/api/auth/reset-password/route.ts': {
    AUTH_001: { 400: 'AUTH_001' },
    AUTH_002: { 400: 'RATE_LIMITED' },
    AUTH_003: { 400: 'FORBIDDEN' },
    AUTH_006: { 400: 'VALIDATION_FAILED' },
    AUTH_007: { 400: 'CONFLICT' },
    AUTH_999: { 400: 'INTERNAL_ERROR', 500: 'INTERNAL_ERROR' },
  },
  'src/app/api/auth/signin/route.ts': {
    AUTH_001: { 401: 'AUTH_001' },
    AUTH_002: { 403: 'RATE_LIMITED' },
    AUTH_003: { 403: 'FORBIDDEN' },
    AUTH_006: { 400: 'VALIDATION_FAILED' },
    AUTH_007: { 500: 'CONFLICT' },
    AUTH_999: { 500: 'INTERNAL_ERROR' },
  },
  'src/app/api/auth/signup/route.ts': {
    AUTH_001: { 401: 'AUTH_001' },
    AUTH_002: { 403: 'RATE_LIMITED' },
    AUTH_003: { 403: 'FORBIDDEN' },
    AUTH_006: { 400: 'VALIDATION_FAILED' },
    AUTH_007: { 409: 'CONFLICT' },
    AUTH_999: { 500: 'INTERNAL_ERROR' },
    SIGNUP_DISABLED: { 403: 'FORBIDDEN' },
  },
  'src/app/api/categories/route.ts': {
    SEARCH_002: { 500: 'INTERNAL_ERROR' },
    SEARCH_003: { 500: 'INTERNAL_ERROR' },
    SEARCH_999: { 500: 'INTERNAL_ERROR' },
  },
  'src/app/api/checklists/[id]/items/[itemId]/toggle/route.ts': {
    CHECKLIST_001: { 404: 'NOT_FOUND' },
    CHECKLIST_002: { 400: 'VALIDATION_FAILED' },
    CHECKLIST_003: { 401: 'AUTH_REQUIRED', 403: 'FORBIDDEN' },
    CHECKLIST_004: { 404: 'NOT_FOUND' },
    CHECKLIST_005: { 400: 'VALIDATION_FAILED' },
    CHECKLIST_006: { 404: 'NOT_FOUND' },
    CHECKLIST_999: { 500: 'INTERNAL_ERROR' },
  },
  'src/app/api/checklists/[id]/route.ts': {
    CHECKLIST_001: { 404: 'NOT_FOUND' },
    CHECKLIST_002: { 400: 'VALIDATION_FAILED' },
    CHECKLIST_003: { 401: 'AUTH_REQUIRED', 403: 'FORBIDDEN' },
    CHECKLIST_004: { 404: 'NOT_FOUND' },
    CHECKLIST_005: { 400: 'VALIDATION_FAILED' },
    CHECKLIST_006: { 404: 'NOT_FOUND' },
    CHECKLIST_999: { 500: 'INTERNAL_ERROR' },
  },
  'src/app/api/checklists/[id]/sync/route.ts': {
    RUN_SYNC_REMOVED: { 410: 'RUN_SYNC_REMOVED' },
  },
  'src/app/api/checklists/route.ts': {
    CHECKLIST_001: { 404: 'NOT_FOUND' },
    CHECKLIST_002: { 400: 'VALIDATION_FAILED' },
    CHECKLIST_003: { 401: 'AUTH_REQUIRED', 403: 'FORBIDDEN' },
    CHECKLIST_004: { 404: 'NOT_FOUND' },
    CHECKLIST_005: { 400: 'VALIDATION_FAILED' },
    CHECKLIST_006: { 404: 'NOT_FOUND' },
    CHECKLIST_999: { 500: 'INTERNAL_ERROR' },
  },
  'src/app/api/collaborators/[id]/accept/route.ts': {
    COLLAB_001: { 500: 'NOT_FOUND' },
    COLLAB_004: { 403: 'FORBIDDEN' },
    COLLAB_008: { 404: 'NOT_FOUND' },
    COLLAB_009: { 400: 'CONFLICT' },
    COLLAB_010: { 401: 'AUTH_REQUIRED' },
    COLLAB_999: { 500: 'INTERNAL_ERROR' },
  },
  'src/app/api/collaborators/[id]/route.ts': {
    COLLAB_001: { 404: 'NOT_FOUND' },
    COLLAB_004: { 403: 'FORBIDDEN' },
    COLLAB_007: { 400: 'VALIDATION_FAILED' },
    COLLAB_010: { 401: 'AUTH_REQUIRED' },
    COLLAB_999: { 500: 'INTERNAL_ERROR' },
  },
  'src/app/api/items/[id]/route.ts': {
    ITEM_001: { 404: 'NOT_FOUND' },
    ITEM_002: { 400: 'VALIDATION_FAILED' },
    ITEM_003: { 401: 'AUTH_REQUIRED', 403: 'FORBIDDEN' },
    ITEM_004: { 404: 'NOT_FOUND' },
    ITEM_005: { 400: 'VALIDATION_FAILED' },
    ITEM_006: { 400: 'VALIDATION_FAILED' },
    ITEM_007: { 400: 'VALIDATION_FAILED' },
    ITEM_008: { 404: 'NOT_FOUND' },
    ITEM_009: { 404: 'NOT_FOUND' },
    ITEM_010: { 400: 'VALIDATION_FAILED' },
    ITEM_011: { 400: 'REFERENCE_CYCLE' },
    ITEM_999: { 500: 'INTERNAL_ERROR' },
  },
  'src/app/api/llm/enhance/route.ts': {
    AUTH_001: { 401: 'AUTH_REQUIRED' },
    LLM_001: { 400: 'VALIDATION_FAILED' },
    LLM_003: { 400: 'VALIDATION_FAILED' },
    LLM_005: { 400: 'UPSTREAM_FAILED' },
    LLM_006: { 400: 'UPSTREAM_FAILED' },
    LLM_999: { 500: 'INTERNAL_ERROR' },
    VALIDATION_001: { 400: 'VALIDATION_FAILED' },
    VALIDATION_002: { 400: 'VALIDATION_FAILED' },
  },
  'src/app/api/llm/generate/route.ts': {
    AUTH_001: { 401: 'AUTH_REQUIRED' },
    LLM_001: { 400: 'VALIDATION_FAILED' },
    LLM_003: { 400: 'VALIDATION_FAILED' },
    LLM_005: { 400: 'UPSTREAM_FAILED' },
    LLM_006: { 400: 'UPSTREAM_FAILED' },
    LLM_007: { 400: 'RATE_LIMITED' },
    LLM_999: { 500: 'INTERNAL_ERROR' },
    VALIDATION_001: { 400: 'VALIDATION_FAILED' },
  },
  'src/app/api/llm/improve/route.ts': {
    AUTH_001: { 401: 'AUTH_REQUIRED' },
    LLM_001: { 400: 'VALIDATION_FAILED' },
    LLM_003: { 400: 'VALIDATION_FAILED' },
    LLM_005: { 400: 'UPSTREAM_FAILED' },
    LLM_006: { 400: 'UPSTREAM_FAILED' },
    LLM_999: { 500: 'INTERNAL_ERROR' },
    VALIDATION_001: { 400: 'VALIDATION_FAILED' },
    VALIDATION_002: { 400: 'VALIDATION_FAILED' },
    VALIDATION_003: { 400: 'VALIDATION_FAILED' },
    VALIDATION_004: { 400: 'VALIDATION_FAILED' },
  },
  'src/app/api/llm/models/route.ts': {
    AUTH_001: { 401: 'AUTH_REQUIRED' },
    LLM_001: { 400: 'VALIDATION_FAILED' },
    LLM_002: { 400: 'VALIDATION_FAILED' },
    LLM_004: { 400: 'UPSTREAM_FAILED' },
    LLM_008: { 400: 'VALIDATION_FAILED' },
    LLM_999: { 500: 'INTERNAL_ERROR' },
  },
  // Relay results carry the LLM service's codes inside a 200 body.
  'src/app/api/relay/next/route.ts': {
    AUTH_001: { 401: 'AUTH_REQUIRED' },
    LLM_001: { 200: 'VALIDATION_FAILED' },
    LLM_003: { 200: 'VALIDATION_FAILED' },
    LLM_004: { 200: 'UPSTREAM_FAILED' },
    LLM_005: { 200: 'UPSTREAM_FAILED' },
    LLM_006: { 200: 'UPSTREAM_FAILED' },
    LLM_007: { 200: 'RATE_LIMITED' },
    LLM_008: { 200: 'VALIDATION_FAILED' },
    RELAY_002: { 500: 'INTERNAL_ERROR' },
    RELAY_CLIENT_ERROR: { 200: 'UPSTREAM_FAILED' },
    RELAY_TOKEN_ERROR: { 401: 'VALIDATION_FAILED' },
    UNKNOWN: { 200: 'VALIDATION_FAILED' },
    VALIDATION_001: { 400: 'VALIDATION_FAILED' },
    VALIDATION_002: { 400: 'VALIDATION_FAILED' },
  },
  'src/app/api/relay/start/route.ts': {
    AUTH_001: { 401: 'AUTH_REQUIRED' },
    LLM_001: { 200: 'VALIDATION_FAILED' },
    LLM_002: { 200: 'VALIDATION_FAILED' },
    LLM_003: { 200: 'VALIDATION_FAILED' },
    LLM_004: { 200: 'UPSTREAM_FAILED' },
    LLM_005: { 200: 'UPSTREAM_FAILED' },
    LLM_006: { 200: 'UPSTREAM_FAILED' },
    LLM_007: { 200: 'RATE_LIMITED' },
    LLM_008: { 200: 'VALIDATION_FAILED' },
    RELAY_001: { 500: 'INTERNAL_ERROR' },
    UNKNOWN: { 200: 'VALIDATION_FAILED' },
    VALIDATION_001: { 400: 'VALIDATION_FAILED' },
  },
  'src/app/api/search/route.ts': {
    SEARCH_001: { 400: 'VALIDATION_FAILED' },
    SEARCH_002: { 400: 'VALIDATION_FAILED' },
    SEARCH_003: { 500: 'INTERNAL_ERROR' },
    SEARCH_999: { 500: 'INTERNAL_ERROR' },
  },
  'src/app/api/templates/[id]/collaborators/route.ts': {
    COLLAB_001: { 404: 'NOT_FOUND', 500: 'NOT_FOUND' },
    COLLAB_002: { 404: 'NOT_FOUND' },
    COLLAB_003: { 404: 'NOT_FOUND' },
    // 400 is the invite to a public template.
    COLLAB_004: { 400: 'CONFLICT', 403: 'FORBIDDEN', 500: 'FORBIDDEN' },
    COLLAB_005: { 400: 'CONFLICT' },
    COLLAB_006: { 400: 'CONFLICT' },
    COLLAB_007: { 400: 'VALIDATION_FAILED' },
    COLLAB_010: { 401: 'AUTH_REQUIRED' },
    COLLAB_999: { 500: 'INTERNAL_ERROR' },
  },
  'src/app/api/templates/[id]/copy/route.ts': {
    TEMPLATE_001: { 404: 'NOT_FOUND', 500: 'NOT_FOUND' },
    TEMPLATE_002: { 400: 'VALIDATION_FAILED', 500: 'VALIDATION_FAILED' },
    TEMPLATE_003: { 401: 'AUTH_REQUIRED', 403: 'FORBIDDEN', 500: 'FORBIDDEN' },
    TEMPLATE_004: { 500: 'NOT_FOUND' },
    TEMPLATE_005: { 500: 'VALIDATION_FAILED' },
    TEMPLATE_006: { 500: 'VALIDATION_FAILED' },
    TEMPLATE_999: { 500: 'INTERNAL_ERROR' },
  },
  'src/app/api/templates/[id]/export/route.ts': {
    EXPORT_001: { 404: 'NOT_FOUND' },
    EXPORT_002: { 403: 'FORBIDDEN' },
    EXPORT_003: { 400: 'VALIDATION_FAILED' },
    EXPORT_004: { 500: 'INTERNAL_ERROR' },
    EXPORT_999: { 500: 'INTERNAL_ERROR' },
  },
  'src/app/api/templates/[id]/items/reorder/route.ts': {
    ITEM_001: { 404: 'NOT_FOUND' },
    ITEM_002: { 400: 'VALIDATION_FAILED' },
    ITEM_003: { 401: 'AUTH_REQUIRED', 403: 'FORBIDDEN' },
    ITEM_004: { 404: 'NOT_FOUND' },
    ITEM_005: { 500: 'VALIDATION_FAILED' },
    ITEM_006: { 500: 'VALIDATION_FAILED' },
    ITEM_007: { 500: 'VALIDATION_FAILED' },
    ITEM_009: { 404: 'NOT_FOUND' },
    ITEM_010: { 400: 'VALIDATION_FAILED' },
    ITEM_011: { 400: 'REFERENCE_CYCLE' },
    ITEM_999: { 500: 'INTERNAL_ERROR' },
    TEMPLATE_001: { 404: 'NOT_FOUND' },
  },
  'src/app/api/templates/[id]/items/route.ts': {
    ITEM_001: { 404: 'NOT_FOUND' },
    ITEM_002: { 400: 'VALIDATION_FAILED' },
    ITEM_003: { 401: 'AUTH_REQUIRED', 403: 'FORBIDDEN' },
    ITEM_004: { 404: 'NOT_FOUND' },
    ITEM_005: { 400: 'VALIDATION_FAILED' },
    ITEM_006: { 400: 'VALIDATION_FAILED' },
    ITEM_007: { 400: 'VALIDATION_FAILED' },
    ITEM_008: { 404: 'NOT_FOUND' },
    ITEM_009: { 404: 'NOT_FOUND' },
    ITEM_010: { 400: 'VALIDATION_FAILED' },
    ITEM_011: { 400: 'REFERENCE_CYCLE' },
    ITEM_999: { 500: 'INTERNAL_ERROR' },
    TEMPLATE_001: { 404: 'NOT_FOUND' },
  },
  'src/app/api/templates/[id]/route.ts': {
    TEMPLATE_001: { 404: 'NOT_FOUND' },
    TEMPLATE_002: { 400: 'VALIDATION_FAILED' },
    TEMPLATE_003: { 401: 'AUTH_REQUIRED', 403: 'FORBIDDEN' },
    TEMPLATE_004: { 404: 'NOT_FOUND' },
    TEMPLATE_005: { 400: 'VALIDATION_FAILED' },
    TEMPLATE_006: { 400: 'VALIDATION_FAILED' },
    TEMPLATE_007: { 400: 'VALIDATION_FAILED' },
    TEMPLATE_008: { 400: 'CONFLICT' },
    TEMPLATE_999: { 500: 'INTERNAL_ERROR' },
  },
  'src/app/api/templates/[id]/visibility/route.ts': {
    TEMPLATE_001: { 404: 'NOT_FOUND' },
    TEMPLATE_002: { 400: 'VALIDATION_FAILED' },
    TEMPLATE_003: { 401: 'AUTH_REQUIRED', 403: 'FORBIDDEN' },
    TEMPLATE_007: { 400: 'VALIDATION_FAILED' },
    TEMPLATE_008: { 400: 'CONFLICT' },
    TEMPLATE_999: { 500: 'INTERNAL_ERROR' },
  },
  'src/app/api/templates/import/route.ts': {
    IMPORT_001: { 400: 'VALIDATION_FAILED' },
    IMPORT_002: { 400: 'VALIDATION_FAILED' },
    IMPORT_003: { 400: 'VALIDATION_FAILED' },
    IMPORT_004: { 400: 'VALIDATION_FAILED' },
    IMPORT_005: { 400: 'VALIDATION_FAILED' },
    IMPORT_006: { 404: 'NOT_FOUND' },
    IMPORT_007: { 401: 'AUTH_REQUIRED', 403: 'FORBIDDEN' },
    IMPORT_008: { 500: 'INTERNAL_ERROR' },
    // #74 (CHECKMATE-16.1) cites this mapping.
    IMPORT_009: { 400: 'UNSUPPORTED_VERSION' },
    IMPORT_999: { 500: 'INTERNAL_ERROR' },
  },
  'src/app/api/templates/route.ts': {
    TEMPLATE_001: { 404: 'NOT_FOUND' },
    TEMPLATE_002: { 400: 'VALIDATION_FAILED' },
    TEMPLATE_003: { 401: 'AUTH_REQUIRED', 403: 'FORBIDDEN' },
    TEMPLATE_004: { 404: 'NOT_FOUND' },
    TEMPLATE_005: { 400: 'VALIDATION_FAILED' },
    TEMPLATE_006: { 400: 'VALIDATION_FAILED' },
    TEMPLATE_007: { 400: 'VALIDATION_FAILED' },
    TEMPLATE_008: { 400: 'CONFLICT' },
    TEMPLATE_999: { 500: 'INTERNAL_ERROR' },
  },
};

/**
 * Codes no response carries today, by the file that produces them. Server
 * pages, server actions and browser-side service calls use them in process;
 * server actions return only their messages.
 */
const IN_PROCESS: Readonly<Record<string, Readonly<Record<string, ErrorCode>>>> = {
  'src/lib/services/activity.ts': {
    ACTIVITY_001: 'NOT_FOUND',
    ACTIVITY_002: 'FORBIDDEN',
    ACTIVITY_003: 'AUTH_REQUIRED',
    ACTIVITY_004: 'INTERNAL_ERROR',
    ACTIVITY_005: 'NOT_FOUND',
    ACTIVITY_006: 'CONFLICT',
    ACTIVITY_999: 'INTERNAL_ERROR',
  },
  'src/lib/services/notification.ts': {
    NOTIF_001: 'NOT_FOUND',
    NOTIF_002: 'FORBIDDEN',
    NOTIF_003: 'AUTH_REQUIRED',
    NOTIF_004: 'INTERNAL_ERROR',
    NOTIF_999: 'INTERNAL_ERROR',
  },
  'src/lib/services/preferences.ts': {
    PREF_001: 'AUTH_REQUIRED',
    PREF_002: 'VALIDATION_FAILED',
    PREF_003: 'VALIDATION_FAILED',
    PREF_004: 'INTERNAL_ERROR',
    PREF_005: 'INTERNAL_ERROR',
    PREF_999: 'INTERNAL_ERROR',
  },
  'src/lib/services/template.ts': {
    TEMPLATE_DUPLICATE_FAILED: 'INTERNAL_ERROR',
  },
  'src/lib/services/web-research.ts': {
    WEB_001: 'VALIDATION_FAILED',
    WEB_002: 'VALIDATION_FAILED',
    WEB_003: 'UPSTREAM_FAILED',
    WEB_004: 'VALIDATION_FAILED',
    WEB_005: 'RATE_LIMITED',
    WEB_006: 'VALIDATION_FAILED',
    WEB_999: 'INTERNAL_ERROR',
  },
  'src/lib/services/workspace.ts': {
    WORKSPACE_001: 'NOT_FOUND',
    WORKSPACE_002: 'VALIDATION_FAILED',
    WORKSPACE_003: 'FORBIDDEN',
    WORKSPACE_004: 'VALIDATION_FAILED',
    WORKSPACE_005: 'VALIDATION_FAILED',
    WORKSPACE_006: 'CONFLICT',
    WORKSPACE_007: 'CONFLICT',
    WORKSPACE_999: 'INTERNAL_ERROR',
  },
};

export interface LegacyUse {
  readonly code: string;
  /** The status a response sends it with; null when no response carries it. */
  readonly status: number | null;
  /** The file that returns the response, or that produces the code. */
  readonly file: string;
  /** The registry code this use means. */
  readonly to: ErrorCode;
}

export const LEGACY_CODE_MAP: readonly LegacyUse[] = [
  ...Object.entries(SENT).flatMap(([file, codes]) =>
    Object.entries(codes).flatMap(([code, statuses]) =>
      Object.entries(statuses).map(([status, to]) => ({ code, status: Number(status), file, to }))
    )
  ),
  ...Object.entries(IN_PROCESS).flatMap(([file, codes]) =>
    Object.entries(codes).map(([code, to]) => ({ code, status: null, file, to }))
  ),
];

function legacyKey(code: string, status: number | null, file: string): string {
  return `${file}\u0000${code}\u0000${status ?? ''}`;
}

const LEGACY_LOOKUP = new Map(
  LEGACY_CODE_MAP.map((use) => [legacyKey(use.code, use.status, use.file), use.to])
);

/**
 * The registry code a legacy use means. `file` is the repo-relative path of
 * the returning file; `status` is null for a code no response carries.
 */
export function mapLegacyCode(code: string, status: number | null, file: string): ErrorCode | undefined {
  return LEGACY_LOOKUP.get(legacyKey(code, status, file));
}
