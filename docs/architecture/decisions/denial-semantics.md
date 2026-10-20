# Denial semantics

- Status: Accepted
- Supersedes: none
- Superseded by: none

## Context

At [`9019d17`](https://github.com/keyurgolani/Checkmate/tree/9019d176ee456477d387d821c88a7c62977eebab) one denial comes back in six body shapes, and a code doesn't say what happened. [`withAuth`](https://github.com/keyurgolani/Checkmate/blob/9019d176ee456477d387d821c88a7c62977eebab/src/lib/api/route-helpers.ts#L124-L128) sends the route's code with 401, so the 403 code `TEMPLATE_003` also means "not signed in" ([`templates/[id]/route.ts:207-212`](https://github.com/keyurgolani/Checkmate/blob/9019d176ee456477d387d821c88a7c62977eebab/src/app/api/templates/%5Bid%5D/route.ts#L207-L212)). [`AUTH_001`](https://github.com/keyurgolani/Checkmate/blob/9019d176ee456477d387d821c88a7c62977eebab/src/lib/services/auth.ts#L85-L86) is a wrong password at sign-in and no session in the `llm` and `relay` routes. Server actions return a message and no code ([`actions.ts:120-122`](https://github.com/keyurgolani/Checkmate/blob/9019d176ee456477d387d821c88a7c62977eebab/src/app/%28dashboard%29/workspaces/%5Bid%5D/actions.ts#L120-L122)).

## Decision

1. Every error is one envelope, `{ success: false, error: { code, message, details?, timestamp, correlationId } }`, built by [`error-envelope.ts`](../../../src/lib/api/error-envelope.ts). Routes send it with the code's status. Server actions return the same object without a status. `correlationId` is generated until [02.1 sessions](https://github.com/keyurgolani/Checkmate/issues/32) passes the request's, and a malformed one is replaced.
2. [`error-codes.ts`](../../../src/lib/api/error-codes.ts) gives each code one status, and the helper reads it. Outcome codes, starting with `UNCHANGED` (200), return the success body with a top-level `code`.
3. Denial codes are entity-neutral:

   | Status | Code | When |
   |---|---|---|
   | 400 | `VALIDATION_FAILED` | Invalid input. `details.fields` maps each field to what's wrong with it. |
   | 401 | `AUTH_REQUIRED` | No session. [02.1 sessions](https://github.com/keyurgolani/Checkmate/issues/32) registers `SESSION_EXPIRED`, `SESSION_REVOKED`, `SESSION_LEGACY`, and `REAUTH_REQUIRED` past a `recent-reauth` window. |
   | 403 | `FORBIDDEN` | The actor passed a projection cell but may not do this. [02.1 sessions](https://github.com/keyurgolani/Checkmate/issues/32) registers `CSRF_REJECTED`, which the proxy returns before any lookup. |
   | 404 | `NOT_FOUND` | Missing, or not visible to the actor. |
   | 404 | `CAPABILITY_INVALID` | The capability expired, was revoked, or is unknown. |
   | 429 | `RATE_LIMITED` | A rate limit, either the [02.1 sessions](https://github.com/keyurgolani/Checkmate/issues/32) limiter's or an upstream provider's. `details.source` says which. |
   | 503 | `POLICY_UNAVAILABLE` | A policy lookup failed. Never 404 or `false`. |

4. For `NOT_FOUND` and `CAPABILITY_INVALID` the helper sends the same response whatever the caller passes. It drops any message, details or extra headers, so only `timestamp` and `correlationId` vary. Routes still have to answer a target the actor can't see with `NOT_FOUND`.
5. Caller-proposed workspaces, templates and runs are checked against a server relation. Caller-asserted owner, user, role, permission or acceptance fields are rejected.
6. Bulk commands authorize each item and report a per-item `NOT_FOUND` or `FORBIDDEN` by the single-item rule. [11.1 commands](https://github.com/keyurgolani/Checkmate/issues/59) owns bulk commit semantics.
7. `INTERNAL_ERROR` (500) covers a failure no narrower code describes. [21.3 async states](https://github.com/keyurgolani/Checkmate/issues/91) adds `READ_FAILED` and `WRITE_INCOMPLETE` (both 500) for failed reads and partial writes, and legacy rows that mean those move to them as it converts the routes.
8. Codes that predate the registry go through its legacy map, keyed by (legacy code, status, returning file, HTTP method). Where one method sends one code with one status for two meanings, each row names a reason. Reset-password's `AUTH_006` is `VALIDATION_FAILED` for missing input and `CAPABILITY_INVALID` for a reset token the backend rejects. `TEMPLATE_003` is `AUTH_REQUIRED` at 401, `FORBIDDEN` at 403, and `NOT_FOUND` where the copy route can't show the actor the source. `AUTH_001` stays the sign-in failure code, since [02.1 sessions](https://github.com/keyurgolani/Checkmate/issues/32) keeps it, and is `AUTH_REQUIRED` where an `llm` or `relay` route sends it.
9. The registry reserves the codes the public issues of [00.1 storage rules](https://github.com/keyurgolani/Checkmate/issues/25), [00.2 secret store](https://github.com/keyurgolani/Checkmate/issues/26), [00.4 logger](https://github.com/keyurgolani/Checkmate/issues/28) and [18.2 ledger](https://github.com/keyurgolani/Checkmate/issues/81) define, at the statuses those issues give. Each leaf drops a reservation when it starts sending that code.

## Consequences

- A leaf registers its codes in `error-codes.ts` in its PR. [`error-codes.test.ts`](../../../src/lib/api/error-codes.test.ts) scans `src/` and fails when an `*ErrorCodes` member or literal error code is neither registered nor in the legacy map; when a route or the proxy sends a code with a method and status the map doesn't list, or one whose code or status the scan can't pin down; when a map row matches no response; and when a reserved code is sent. It reads forwarded codes through each service's typed error code and the route's status function, and a body built in a variable only through its type.
- [21.3 async states](https://github.com/keyurgolani/Checkmate/issues/91) moves internal routes and server actions onto the envelope. Until then legacy codes keep working through the map, and codeless error bodies under `src/app` stay on [`codeless-error-bodies.ts`](../../../src/lib/api/codeless-error-bodies.ts), which [21.3 async states](https://github.com/keyurgolani/Checkmate/issues/91) owns. The test fails when a file's count changes, and CI's [`check-shrinking-lists.mjs`](../../../scripts/ci/check-shrinking-lists.mjs) fails a change that raises a count or adds a file.
- [02.1 sessions](https://github.com/keyurgolani/Checkmate/issues/32) moves proxy denials onto the envelope, and [15.1 public API](https://github.com/keyurgolani/Checkmate/issues/71) exposes it unchanged on `/api/v1`. [02.1 sessions](https://github.com/keyurgolani/Checkmate/issues/32), [03.1 memberships](https://github.com/keyurgolani/Checkmate/issues/35), [11.1 commands](https://github.com/keyurgolani/Checkmate/issues/59) and [21.3 async states](https://github.com/keyurgolani/Checkmate/issues/91) enforce these semantics.
