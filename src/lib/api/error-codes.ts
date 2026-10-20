/**
 * CHECKMATE-01.2 · envelope (#30): the code registry and the legacy map.
 *
 * Every code has one HTTP status, which error-envelope.ts reads. Error codes
 * carry a 4xx or 5xx status. Outcome codes carry a 2xx status and return the
 * success body with a top-level `code`. A leaf registers its own codes here
 * in its PR. A code registered ahead of the leaf that sends it is reserved
 * for that leaf, which drops the reservation when it starts sending it.
 *
 * The legacy map covers every code that predates the registry. Each use is
 * keyed by (legacy code, status, returning file, HTTP method), so one legacy
 * code can mean different things in different places. Legacy codes keep
 * working through it until #91 (CHECKMATE-21.3, async states) moves routes
 * onto the envelope.
 *
 * error-codes.test.ts checks both against a scan of src/, and
 * docs/architecture/decisions/denial-semantics.md records the decision.
 */

import type { LeafId } from '@/lib/domain/contract';

export interface CodeSpec {
  /** The status of every response that carries this code. */
  readonly status: number;
  /** Default copy, used when the caller passes no message. */
  readonly message: string;
  /** Registered ahead of this leaf, which sends it first and removes this field. */
  readonly reservedFor?: LeafId;
}

export const ERROR_CODES = {
  // Outcome codes. #59 (CHECKMATE-11.1, commands) registers the rest of its outcomes.
  UNCHANGED: { status: 200, message: 'Already up to date. Nothing changed.', reservedFor: '11.1' },

  // Denial semantics, entity-neutral.
  VALIDATION_FAILED: { status: 400, message: 'Some values are invalid. Check them and try again.' },
  AUTH_REQUIRED: { status: 401, message: 'Sign in to continue.' },
  FORBIDDEN: { status: 403, message: "You don't have permission to do that." },
  NOT_FOUND: { status: 404, message: "Not found. It may not exist, or it isn't shared with you." },
  CAPABILITY_INVALID: { status: 404, message: 'This link is invalid, expired or revoked.' },
  RATE_LIMITED: { status: 429, message: 'Too many requests. Wait a moment and try again.' },
  POLICY_UNAVAILABLE: {
    status: 503,
    message: "Permissions couldn't be checked right now. Try again.",
    reservedFor: '11.1',
  },

  // Codes that legacy codes on `next` map to.
  UNSUPPORTED_VERSION: { status: 400, message: "This version isn't supported." },
  // Wrong password or unknown account. #32 (CHECKMATE-02.1, sessions) keeps this code.
  AUTH_001: { status: 401, message: 'Email or password is incorrect.' },
  SIGNUP_DISABLED: { status: 403, message: 'New account registration is currently disabled.' },
  CONFLICT: { status: 409, message: 'This conflicts with the current state. Refresh and try again.' },
  RUN_SYNC_REMOVED: {
    status: 410,
    message: 'Template sync was removed. A run keeps the steps it was created with.',
  },
  REFERENCE_CYCLE: { status: 422, message: 'This reference would create a loop.' },
  INTERNAL_ERROR: { status: 500, message: 'Something went wrong. Try again.' },
  UPSTREAM_FAILED: { status: 502, message: "A connected service didn't respond as expected. Try again." },

  // Reserved for the leaves whose public issues define them.
  ACCESS_ALREADY_GRANTED: { status: 409, message: 'You already have access.', reservedFor: '00.1' },
  SERVER_IDENTITY_UNAVAILABLE: {
    status: 503,
    message: "The server can't reach its backend right now. Try again.",
    reservedFor: '00.1',
  },
  SECRET_NOT_ACCEPTED: {
    status: 400,
    message: "This request can't carry a key. Save the key in Settings.",
    reservedFor: '00.2',
  },
  EGRESS_DENIED: { status: 403, message: "That address isn't allowed.", reservedFor: '00.2' },
  CREDENTIAL_ENDPOINT_CHANGED: {
    status: 409,
    message: 'The provider or endpoint changed. Enter a new key.',
    reservedFor: '00.2',
  },
  CREDENTIAL_UNAVAILABLE: {
    status: 409,
    message: 'No usable key is saved for this provider. Add one in Settings.',
    reservedFor: '00.2',
  },
  CREDENTIAL_STORE_UNAVAILABLE: {
    status: 503,
    message: "Saved keys can't be read right now. Try again.",
    reservedFor: '00.2',
  },
  CONFIG_001: { status: 503, message: 'A required server setting is missing.', reservedFor: '00.4' },
  CONFIG_002: { status: 503, message: 'A server setting has an invalid value.', reservedFor: '00.4' },
  CONFIG_003: { status: 503, message: 'A server setting was renamed.', reservedFor: '00.4' },
  CONFIG_004: { status: 503, message: "The server couldn't sign in to its backend.", reservedFor: '00.4' },
  CONFIG_005: { status: 503, message: "A server setting is set where it isn't allowed.", reservedFor: '00.4' },
  WORKSPACE_FORBIDDEN: { status: 403, message: "You can't use that workspace.", reservedFor: '18.2' },
  SCHEMA_INCOMPATIBLE: {
    status: 503,
    message: "The database schema doesn't match this version of Checkmate.",
    reservedFor: '18.2',
  },
  SCHEMA_HEAD_UNAVAILABLE: {
    status: 503,
    message: "The database schema version couldn't be read. Try again.",
    reservedFor: '18.2',
  },
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

/** The leaf a registered code waits for, when no route sends it yet. */
export function reservedFor(code: RegistryCode): LeafId | undefined {
  const spec: CodeSpec = ERROR_CODES[code];
  return spec.reservedFor;
}

// ============================================================================
// Legacy map
// ============================================================================

/** A status's registry code, or one per reason where a status carries two meanings. */
type StatusTargets = Readonly<Record<number, ErrorCode | Readonly<Record<string, ErrorCode>>>>;

/** Returning file, then HTTP method (`*` outside a route handler), then legacy code. */
type SentUses = Readonly<Record<string, Readonly<Record<string, Readonly<Record<string, StatusTargets>>>>>>;

/**
 * Uses a response carries today, by the file that returns the response and
 * the route handler's method.
 *
 * `withAuth` sends a route's 403 code with 401, so TEMPLATE_003 means
 * AUTH_REQUIRED at 401 and FORBIDDEN at 403. A route that forwards a service
 * error lists every code in that service's `*ErrorCodes` union, under the
 * route's own status mapping, and each maps to what happened. COLLAB_001
 * sent with 500 is still NOT_FOUND. The categories route's 500s are
 * INTERNAL_ERROR, since that route takes no input. A target the actor may
 * not see is NOT_FOUND whatever status the route used.
 */
const SENT: SentUses = {
  'src/proxy.ts': {
    '*': {
      AUTH_004: { 401: 'AUTH_REQUIRED' },
    },
  },
  'src/app/api/auth/reset-password/route.ts': {
    POST: {
      AUTH_001: { 400: 'AUTH_001' },
      AUTH_002: { 400: 'RATE_LIMITED' },
      AUTH_003: { 400: 'FORBIDDEN' },
      AUTH_004: { 400: 'AUTH_REQUIRED' },
      // Missing input, or a reset token the backend rejects.
      AUTH_006: { 400: { 'invalid input': 'VALIDATION_FAILED', 'reset token rejected': 'CAPABILITY_INVALID' } },
      AUTH_007: { 400: 'CONFLICT' },
      AUTH_999: { 400: 'INTERNAL_ERROR', 500: 'INTERNAL_ERROR' },
    },
  },
  'src/app/api/auth/signin/route.ts': {
    POST: {
      AUTH_001: { 401: 'AUTH_001' },
      AUTH_002: { 403: 'RATE_LIMITED' },
      AUTH_003: { 403: 'FORBIDDEN' },
      AUTH_004: { 500: 'AUTH_REQUIRED' },
      AUTH_006: { 400: 'VALIDATION_FAILED' },
      AUTH_007: { 500: 'CONFLICT' },
      AUTH_999: { 500: 'INTERNAL_ERROR' },
    },
  },
  'src/app/api/auth/signup/route.ts': {
    POST: {
      AUTH_001: { 401: 'AUTH_001' },
      AUTH_002: { 403: 'RATE_LIMITED' },
      AUTH_003: { 403: 'FORBIDDEN' },
      AUTH_004: { 500: 'AUTH_REQUIRED' },
      AUTH_006: { 400: 'VALIDATION_FAILED' },
      AUTH_007: { 409: 'CONFLICT' },
      AUTH_999: { 500: 'INTERNAL_ERROR' },
      SIGNUP_DISABLED: { 403: 'SIGNUP_DISABLED' },
    },
  },
  'src/app/api/categories/route.ts': {
    GET: {
      SEARCH_001: { 500: 'INTERNAL_ERROR' },
      SEARCH_002: { 500: 'INTERNAL_ERROR' },
      SEARCH_003: { 500: 'INTERNAL_ERROR' },
      SEARCH_999: { 500: 'INTERNAL_ERROR' },
    },
  },
  'src/app/api/checklists/[id]/items/[itemId]/toggle/route.ts': {
    PUT: {
      CHECKLIST_001: { 404: 'NOT_FOUND' },
      CHECKLIST_002: { 400: 'VALIDATION_FAILED' },
      CHECKLIST_003: { 401: 'AUTH_REQUIRED', 403: 'FORBIDDEN' },
      CHECKLIST_004: { 404: 'NOT_FOUND' },
      CHECKLIST_005: { 400: 'VALIDATION_FAILED' },
      CHECKLIST_006: { 404: 'NOT_FOUND' },
      CHECKLIST_999: { 500: 'INTERNAL_ERROR' },
    },
  },
  'src/app/api/checklists/[id]/route.ts': {
    GET: {
      CHECKLIST_001: { 404: 'NOT_FOUND' },
      CHECKLIST_003: { 401: 'AUTH_REQUIRED' },
      CHECKLIST_999: { 500: 'INTERNAL_ERROR' },
    },
    PUT: {
      CHECKLIST_001: { 404: 'NOT_FOUND' },
      CHECKLIST_002: { 400: 'VALIDATION_FAILED' },
      CHECKLIST_003: { 401: 'AUTH_REQUIRED', 403: 'FORBIDDEN' },
      CHECKLIST_004: { 404: 'NOT_FOUND' },
      CHECKLIST_005: { 400: 'VALIDATION_FAILED' },
      CHECKLIST_006: { 404: 'NOT_FOUND' },
      CHECKLIST_999: { 500: 'INTERNAL_ERROR' },
    },
    DELETE: {
      CHECKLIST_001: { 404: 'NOT_FOUND' },
      CHECKLIST_002: { 400: 'VALIDATION_FAILED' },
      CHECKLIST_003: { 401: 'AUTH_REQUIRED', 403: 'FORBIDDEN' },
      CHECKLIST_004: { 404: 'NOT_FOUND' },
      CHECKLIST_005: { 400: 'VALIDATION_FAILED' },
      CHECKLIST_006: { 404: 'NOT_FOUND' },
      CHECKLIST_999: { 500: 'INTERNAL_ERROR' },
    },
  },
  'src/app/api/checklists/[id]/sync/route.ts': {
    POST: {
      RUN_SYNC_REMOVED: { 410: 'RUN_SYNC_REMOVED' },
    },
  },
  'src/app/api/checklists/route.ts': {
    GET: {
      CHECKLIST_003: { 401: 'AUTH_REQUIRED' },
      CHECKLIST_999: { 500: 'INTERNAL_ERROR' },
    },
    POST: {
      CHECKLIST_001: { 404: 'NOT_FOUND' },
      CHECKLIST_002: { 400: 'VALIDATION_FAILED' },
      CHECKLIST_003: { 401: 'AUTH_REQUIRED', 403: 'FORBIDDEN' },
      CHECKLIST_004: { 404: 'NOT_FOUND' },
      CHECKLIST_005: { 400: 'VALIDATION_FAILED' },
      CHECKLIST_006: { 404: 'NOT_FOUND' },
      CHECKLIST_999: { 500: 'INTERNAL_ERROR' },
    },
  },
  'src/app/api/collaborators/[id]/accept/route.ts': {
    POST: {
      COLLAB_001: { 500: 'NOT_FOUND' },
      COLLAB_002: { 500: 'NOT_FOUND' },
      COLLAB_003: { 500: 'NOT_FOUND' },
      COLLAB_004: { 403: 'FORBIDDEN' },
      COLLAB_005: { 500: 'CONFLICT' },
      COLLAB_006: { 500: 'CONFLICT' },
      COLLAB_007: { 500: 'VALIDATION_FAILED' },
      COLLAB_008: { 404: 'NOT_FOUND' },
      COLLAB_009: { 400: 'CONFLICT' },
      COLLAB_010: { 401: 'AUTH_REQUIRED' },
      COLLAB_999: { 500: 'INTERNAL_ERROR' },
    },
  },
  'src/app/api/collaborators/[id]/route.ts': {
    PUT: {
      COLLAB_001: { 404: 'NOT_FOUND' },
      COLLAB_002: { 500: 'NOT_FOUND' },
      COLLAB_003: { 500: 'NOT_FOUND' },
      COLLAB_004: { 403: 'FORBIDDEN' },
      COLLAB_005: { 500: 'CONFLICT' },
      COLLAB_006: { 500: 'CONFLICT' },
      COLLAB_007: { 400: 'VALIDATION_FAILED' },
      COLLAB_008: { 500: 'NOT_FOUND' },
      COLLAB_009: { 500: 'CONFLICT' },
      COLLAB_010: { 401: 'AUTH_REQUIRED' },
      COLLAB_999: { 500: 'INTERNAL_ERROR' },
    },
    DELETE: {
      COLLAB_001: { 404: 'NOT_FOUND' },
      COLLAB_002: { 500: 'NOT_FOUND' },
      COLLAB_003: { 500: 'NOT_FOUND' },
      COLLAB_004: { 403: 'FORBIDDEN' },
      COLLAB_005: { 500: 'CONFLICT' },
      COLLAB_006: { 500: 'CONFLICT' },
      COLLAB_007: { 400: 'VALIDATION_FAILED' },
      COLLAB_008: { 500: 'NOT_FOUND' },
      COLLAB_009: { 500: 'CONFLICT' },
      COLLAB_010: { 401: 'AUTH_REQUIRED' },
      COLLAB_999: { 500: 'INTERNAL_ERROR' },
    },
  },
  'src/app/api/items/[id]/route.ts': {
    GET: {
      ITEM_001: { 404: 'NOT_FOUND' },
      ITEM_999: { 500: 'INTERNAL_ERROR' },
    },
    PUT: {
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
    DELETE: {
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
  },
  'src/app/api/llm/enhance/route.ts': {
    POST: {
      AUTH_001: { 401: 'AUTH_REQUIRED' },
      LLM_001: { 400: 'VALIDATION_FAILED' },
      LLM_002: { 400: 'VALIDATION_FAILED' },
      LLM_003: { 400: 'VALIDATION_FAILED' },
      LLM_004: { 400: 'UPSTREAM_FAILED' },
      LLM_005: { 400: 'UPSTREAM_FAILED' },
      LLM_006: { 400: 'UPSTREAM_FAILED' },
      LLM_007: { 400: 'RATE_LIMITED' },
      LLM_008: { 400: 'VALIDATION_FAILED' },
      LLM_999: { 400: 'INTERNAL_ERROR', 500: 'INTERNAL_ERROR' },
      VALIDATION_001: { 400: 'VALIDATION_FAILED' },
      VALIDATION_002: { 400: 'VALIDATION_FAILED' },
    },
  },
  'src/app/api/llm/generate/route.ts': {
    POST: {
      AUTH_001: { 401: 'AUTH_REQUIRED' },
      LLM_001: { 400: 'VALIDATION_FAILED' },
      LLM_002: { 400: 'VALIDATION_FAILED' },
      LLM_003: { 400: 'VALIDATION_FAILED' },
      LLM_004: { 400: 'UPSTREAM_FAILED' },
      LLM_005: { 400: 'UPSTREAM_FAILED' },
      LLM_006: { 400: 'UPSTREAM_FAILED' },
      LLM_007: { 400: 'RATE_LIMITED' },
      LLM_008: { 400: 'VALIDATION_FAILED' },
      LLM_999: { 400: 'INTERNAL_ERROR', 500: 'INTERNAL_ERROR' },
      VALIDATION_001: { 400: 'VALIDATION_FAILED' },
    },
  },
  'src/app/api/llm/improve/route.ts': {
    POST: {
      AUTH_001: { 401: 'AUTH_REQUIRED' },
      LLM_001: { 400: 'VALIDATION_FAILED' },
      LLM_002: { 400: 'VALIDATION_FAILED' },
      LLM_003: { 400: 'VALIDATION_FAILED' },
      LLM_004: { 400: 'UPSTREAM_FAILED' },
      LLM_005: { 400: 'UPSTREAM_FAILED' },
      LLM_006: { 400: 'UPSTREAM_FAILED' },
      LLM_007: { 400: 'RATE_LIMITED' },
      LLM_008: { 400: 'VALIDATION_FAILED' },
      LLM_999: { 400: 'INTERNAL_ERROR', 500: 'INTERNAL_ERROR' },
      VALIDATION_001: { 400: 'VALIDATION_FAILED' },
      VALIDATION_002: { 400: 'VALIDATION_FAILED' },
      VALIDATION_003: { 400: 'VALIDATION_FAILED' },
      VALIDATION_004: { 400: 'VALIDATION_FAILED' },
    },
  },
  'src/app/api/llm/models/route.ts': {
    POST: {
      AUTH_001: { 401: 'AUTH_REQUIRED' },
      LLM_001: { 400: 'VALIDATION_FAILED' },
      LLM_002: { 400: 'VALIDATION_FAILED' },
      LLM_003: { 400: 'VALIDATION_FAILED' },
      LLM_004: { 400: 'UPSTREAM_FAILED' },
      LLM_005: { 400: 'UPSTREAM_FAILED' },
      LLM_006: { 400: 'UPSTREAM_FAILED' },
      LLM_007: { 400: 'RATE_LIMITED' },
      LLM_008: { 400: 'VALIDATION_FAILED' },
      LLM_999: { 400: 'INTERNAL_ERROR', 500: 'INTERNAL_ERROR' },
    },
  },
  // Relay results carry the LLM service's codes inside a 200 body.
  'src/app/api/relay/next/route.ts': {
    POST: {
      AUTH_001: { 401: 'AUTH_REQUIRED' },
      LLM_001: { 200: 'VALIDATION_FAILED' },
      LLM_002: { 200: 'VALIDATION_FAILED' },
      LLM_003: { 200: 'VALIDATION_FAILED' },
      LLM_004: { 200: 'UPSTREAM_FAILED' },
      LLM_005: { 200: 'UPSTREAM_FAILED' },
      LLM_006: { 200: 'UPSTREAM_FAILED' },
      LLM_007: { 200: 'RATE_LIMITED' },
      LLM_008: { 200: 'VALIDATION_FAILED' },
      LLM_999: { 200: 'INTERNAL_ERROR' },
      RELAY_002: { 500: 'INTERNAL_ERROR' },
      RELAY_CLIENT_ERROR: { 200: 'UPSTREAM_FAILED' },
      RELAY_TOKEN_ERROR: { 401: 'VALIDATION_FAILED' },
      UNKNOWN: { 200: 'VALIDATION_FAILED' },
      VALIDATION_001: { 400: 'VALIDATION_FAILED' },
      VALIDATION_002: { 400: 'VALIDATION_FAILED' },
    },
  },
  'src/app/api/relay/start/route.ts': {
    POST: {
      AUTH_001: { 401: 'AUTH_REQUIRED' },
      LLM_001: { 200: 'VALIDATION_FAILED' },
      LLM_002: { 200: 'VALIDATION_FAILED' },
      LLM_003: { 200: 'VALIDATION_FAILED' },
      LLM_004: { 200: 'UPSTREAM_FAILED' },
      LLM_005: { 200: 'UPSTREAM_FAILED' },
      LLM_006: { 200: 'UPSTREAM_FAILED' },
      LLM_007: { 200: 'RATE_LIMITED' },
      LLM_008: { 200: 'VALIDATION_FAILED' },
      LLM_999: { 200: 'INTERNAL_ERROR' },
      RELAY_001: { 500: 'INTERNAL_ERROR' },
      UNKNOWN: { 200: 'VALIDATION_FAILED' },
      VALIDATION_001: { 400: 'VALIDATION_FAILED' },
    },
  },
  'src/app/api/search/route.ts': {
    GET: {
      SEARCH_001: { 400: 'VALIDATION_FAILED' },
      SEARCH_002: { 400: 'VALIDATION_FAILED' },
      SEARCH_003: { 500: 'INTERNAL_ERROR' },
      SEARCH_999: { 500: 'INTERNAL_ERROR' },
    },
  },
  'src/app/api/templates/[id]/collaborators/route.ts': {
    GET: {
      COLLAB_001: { 500: 'NOT_FOUND' },
      COLLAB_002: { 404: 'NOT_FOUND', 500: 'NOT_FOUND' },
      COLLAB_003: { 500: 'NOT_FOUND' },
      // A template the actor can't see.
      COLLAB_004: { 403: 'NOT_FOUND', 500: 'NOT_FOUND' },
      COLLAB_005: { 500: 'CONFLICT' },
      COLLAB_006: { 500: 'CONFLICT' },
      COLLAB_007: { 500: 'VALIDATION_FAILED' },
      COLLAB_008: { 500: 'NOT_FOUND' },
      COLLAB_009: { 500: 'CONFLICT' },
      COLLAB_010: { 401: 'AUTH_REQUIRED', 500: 'AUTH_REQUIRED' },
      COLLAB_999: { 500: 'INTERNAL_ERROR' },
    },
    POST: {
      COLLAB_001: { 404: 'NOT_FOUND' },
      COLLAB_002: { 404: 'NOT_FOUND' },
      COLLAB_003: { 404: 'NOT_FOUND' },
      // 400 is an invite to a public template.
      COLLAB_004: { 400: 'CONFLICT', 403: 'FORBIDDEN' },
      COLLAB_005: { 400: 'CONFLICT' },
      COLLAB_006: { 400: 'CONFLICT' },
      COLLAB_007: { 400: 'VALIDATION_FAILED' },
      COLLAB_008: { 500: 'NOT_FOUND' },
      COLLAB_009: { 500: 'CONFLICT' },
      COLLAB_010: { 401: 'AUTH_REQUIRED' },
      COLLAB_999: { 500: 'INTERNAL_ERROR' },
    },
  },
  'src/app/api/templates/[id]/copy/route.ts': {
    POST: {
      TEMPLATE_001: { 404: 'NOT_FOUND', 500: 'NOT_FOUND' },
      TEMPLATE_002: { 400: 'VALIDATION_FAILED', 500: 'VALIDATION_FAILED' },
      // 403 is a source template the actor can't see.
      TEMPLATE_003: { 401: 'AUTH_REQUIRED', 403: 'NOT_FOUND', 500: 'FORBIDDEN' },
      TEMPLATE_004: { 500: 'NOT_FOUND' },
      TEMPLATE_005: { 500: 'VALIDATION_FAILED' },
      TEMPLATE_006: { 500: 'VALIDATION_FAILED' },
      TEMPLATE_007: { 500: 'VALIDATION_FAILED' },
      TEMPLATE_008: { 500: 'CONFLICT' },
      TEMPLATE_999: { 500: 'INTERNAL_ERROR' },
      TEMPLATE_DUPLICATE_FAILED: { 500: 'INTERNAL_ERROR' },
    },
  },
  'src/app/api/templates/[id]/export/route.ts': {
    GET: {
      EXPORT_001: { 404: 'NOT_FOUND' },
      EXPORT_002: { 403: 'FORBIDDEN' },
      EXPORT_003: { 400: 'VALIDATION_FAILED' },
      EXPORT_004: { 500: 'INTERNAL_ERROR' },
      EXPORT_999: { 500: 'INTERNAL_ERROR' },
    },
  },
  'src/app/api/templates/[id]/items/reorder/route.ts': {
    PUT: {
      ITEM_001: { 404: 'NOT_FOUND' },
      ITEM_002: { 400: 'VALIDATION_FAILED' },
      ITEM_003: { 401: 'AUTH_REQUIRED', 403: 'FORBIDDEN' },
      ITEM_004: { 404: 'NOT_FOUND' },
      ITEM_005: { 500: 'VALIDATION_FAILED' },
      ITEM_006: { 500: 'VALIDATION_FAILED' },
      ITEM_007: { 500: 'VALIDATION_FAILED' },
      ITEM_008: { 500: 'NOT_FOUND' },
      ITEM_009: { 404: 'NOT_FOUND' },
      ITEM_010: { 400: 'VALIDATION_FAILED' },
      ITEM_011: { 400: 'REFERENCE_CYCLE' },
      ITEM_999: { 500: 'INTERNAL_ERROR' },
      TEMPLATE_001: { 404: 'NOT_FOUND' },
    },
  },
  'src/app/api/templates/[id]/items/route.ts': {
    GET: {
      ITEM_999: { 500: 'INTERNAL_ERROR' },
      TEMPLATE_001: { 404: 'NOT_FOUND' },
    },
    POST: {
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
  },
  'src/app/api/templates/[id]/route.ts': {
    GET: {
      TEMPLATE_001: { 404: 'NOT_FOUND' },
      TEMPLATE_999: { 500: 'INTERNAL_ERROR' },
    },
    PUT: {
      TEMPLATE_001: { 404: 'NOT_FOUND' },
      TEMPLATE_002: { 400: 'VALIDATION_FAILED' },
      TEMPLATE_003: { 401: 'AUTH_REQUIRED', 403: 'FORBIDDEN' },
      TEMPLATE_004: { 404: 'NOT_FOUND' },
      TEMPLATE_005: { 400: 'VALIDATION_FAILED' },
      TEMPLATE_006: { 400: 'VALIDATION_FAILED' },
      TEMPLATE_007: { 400: 'VALIDATION_FAILED' },
      TEMPLATE_008: { 400: 'CONFLICT' },
      TEMPLATE_999: { 500: 'INTERNAL_ERROR' },
      TEMPLATE_DUPLICATE_FAILED: { 500: 'INTERNAL_ERROR' },
    },
    DELETE: {
      TEMPLATE_001: { 404: 'NOT_FOUND' },
      TEMPLATE_002: { 400: 'VALIDATION_FAILED' },
      TEMPLATE_003: { 401: 'AUTH_REQUIRED', 403: 'FORBIDDEN' },
      TEMPLATE_004: { 404: 'NOT_FOUND' },
      TEMPLATE_005: { 400: 'VALIDATION_FAILED' },
      TEMPLATE_006: { 400: 'VALIDATION_FAILED' },
      TEMPLATE_007: { 400: 'VALIDATION_FAILED' },
      TEMPLATE_008: { 400: 'CONFLICT' },
      TEMPLATE_999: { 500: 'INTERNAL_ERROR' },
      TEMPLATE_DUPLICATE_FAILED: { 500: 'INTERNAL_ERROR' },
    },
  },
  'src/app/api/templates/[id]/visibility/route.ts': {
    PUT: {
      TEMPLATE_001: { 404: 'NOT_FOUND' },
      TEMPLATE_002: { 400: 'VALIDATION_FAILED' },
      TEMPLATE_003: { 401: 'AUTH_REQUIRED', 403: 'FORBIDDEN' },
      TEMPLATE_004: { 500: 'NOT_FOUND' },
      TEMPLATE_005: { 500: 'VALIDATION_FAILED' },
      TEMPLATE_006: { 500: 'VALIDATION_FAILED' },
      TEMPLATE_007: { 400: 'VALIDATION_FAILED' },
      TEMPLATE_008: { 400: 'CONFLICT' },
      TEMPLATE_999: { 500: 'INTERNAL_ERROR' },
      TEMPLATE_DUPLICATE_FAILED: { 500: 'INTERNAL_ERROR' },
    },
  },
  'src/app/api/templates/import/route.ts': {
    POST: {
      IMPORT_001: { 400: 'VALIDATION_FAILED' },
      IMPORT_002: { 400: 'VALIDATION_FAILED' },
      IMPORT_003: { 400: 'VALIDATION_FAILED' },
      IMPORT_004: { 400: 'VALIDATION_FAILED' },
      IMPORT_005: { 400: 'VALIDATION_FAILED' },
      IMPORT_006: { 404: 'NOT_FOUND' },
      IMPORT_007: { 401: 'AUTH_REQUIRED', 403: 'FORBIDDEN' },
      IMPORT_008: { 500: 'INTERNAL_ERROR' },
      // #74 (CHECKMATE-16.1, portable formats) cites this mapping.
      IMPORT_009: { 400: 'UNSUPPORTED_VERSION' },
      IMPORT_999: { 500: 'INTERNAL_ERROR' },
    },
  },
  'src/app/api/templates/route.ts': {
    GET: {
      TEMPLATE_003: { 401: 'AUTH_REQUIRED' },
      TEMPLATE_999: { 500: 'INTERNAL_ERROR' },
    },
    POST: {
      TEMPLATE_001: { 404: 'NOT_FOUND' },
      TEMPLATE_002: { 400: 'VALIDATION_FAILED' },
      TEMPLATE_003: { 401: 'AUTH_REQUIRED', 403: 'FORBIDDEN' },
      TEMPLATE_004: { 404: 'NOT_FOUND' },
      TEMPLATE_005: { 400: 'VALIDATION_FAILED' },
      TEMPLATE_006: { 400: 'VALIDATION_FAILED' },
      TEMPLATE_007: { 400: 'VALIDATION_FAILED' },
      TEMPLATE_008: { 400: 'CONFLICT' },
      TEMPLATE_999: { 500: 'INTERNAL_ERROR' },
      TEMPLATE_DUPLICATE_FAILED: { 500: 'INTERNAL_ERROR' },
    },
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
  /** The route handler's HTTP method, `*` outside a handler; null when no response carries it. */
  readonly method: string | null;
  /** Which meaning, where one method sends one code with one status for two. */
  readonly reason?: string;
  /** The registry code this use means. */
  readonly to: ErrorCode;
}

export const LEGACY_CODE_MAP: readonly LegacyUse[] = [
  ...Object.entries(SENT).flatMap(([file, methods]) =>
    Object.entries(methods).flatMap(([method, codes]) =>
      Object.entries(codes).flatMap(([code, statuses]) =>
        Object.entries(statuses).flatMap(([status, target]): LegacyUse[] =>
          typeof target === 'string'
            ? [{ code, status: Number(status), file, method, to: target }]
            : Object.entries(target).map(([reason, to]) => ({ code, status: Number(status), file, method, reason, to }))
        )
      )
    )
  ),
  ...Object.entries(IN_PROCESS).flatMap(([file, codes]) =>
    Object.entries(codes).map(([code, to]): LegacyUse => ({ code, status: null, file, method: null, to }))
  ),
];

export type LegacyKey = Pick<LegacyUse, 'code' | 'status' | 'file' | 'method' | 'reason'>;

function keyOf({ code, status, file, method }: LegacyKey): string {
  return [file, method ?? '', code, status ?? ''].join('\u0000');
}

const LEGACY_LOOKUP = new Map<string, LegacyUse[]>();
for (const use of LEGACY_CODE_MAP) {
  const key = keyOf(use);
  LEGACY_LOOKUP.set(key, [...(LEGACY_LOOKUP.get(key) ?? []), use]);
}

/**
 * The registry code a legacy use means. `file` is the repo-relative path of
 * the returning file. A use that lists reasons needs the matching `reason`,
 * and gets undefined without one.
 */
export function mapLegacyCode(use: LegacyKey): ErrorCode | undefined {
  const uses = LEGACY_LOOKUP.get(keyOf(use)) ?? [];
  if (uses.length === 1 && uses[0]?.reason === undefined) return uses[0]?.to;
  return uses.find((candidate) => use.reason !== undefined && candidate.reason === use.reason)?.to;
}
