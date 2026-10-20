# Denial semantics

- Status: Accepted
- Supersedes: none
- Superseded by: none

## Context

At [`9019d17`](https://github.com/keyurgolani/Checkmate/tree/9019d176ee456477d387d821c88a7c62977eebab) one denial comes back in six body shapes, and a code doesn't say what happened. [`withAuth`](https://github.com/keyurgolani/Checkmate/blob/9019d176ee456477d387d821c88a7c62977eebab/src/lib/api/route-helpers.ts#L124-L128) sends the route's code with 401, so the 403 code `TEMPLATE_003` also means "not signed in" ([`templates/[id]/route.ts:207-212`](https://github.com/keyurgolani/Checkmate/blob/9019d176ee456477d387d821c88a7c62977eebab/src/app/api/templates/%5Bid%5D/route.ts#L207-L212)). [`AUTH_001`](https://github.com/keyurgolani/Checkmate/blob/9019d176ee456477d387d821c88a7c62977eebab/src/lib/services/auth.ts#L85-L86) is a wrong password at sign-in and no session in the `llm` and `relay` routes. Server actions return a message and no code ([`actions.ts:120-122`](https://github.com/keyurgolani/Checkmate/blob/9019d176ee456477d387d821c88a7c62977eebab/src/app/%28dashboard%29/workspaces/%5Bid%5D/actions.ts#L120-L122)).

## Decision

1. Every error is one envelope, `{ success: false, error: { code, message, details?, timestamp, correlationId } }`, built by [`error-envelope.ts`](../../../src/lib/api/error-envelope.ts). Routes send it with the code's status. Server actions return the same object without a status. `correlationId` is generated until [02.1](https://github.com/keyurgolani/Checkmate/issues/32) passes the request's.
2. [`error-codes.ts`](../../../src/lib/api/error-codes.ts) gives each code one status, and the helper reads it. Outcome codes, starting with `UNCHANGED` (200), return the success body with a top-level `code`.
3. Denial codes are entity-neutral:

   | Status | Code | When |
   |---|---|---|
   | 400 | `VALIDATION_FAILED` | Invalid input. `details.fields` maps each field to what's wrong with it. |
   | 401 | `AUTH_REQUIRED` | No session. 02.1 registers `SESSION_EXPIRED`, `SESSION_REVOKED`, `SESSION_LEGACY`, and `REAUTH_REQUIRED` past a `recent-reauth` window. |
   | 403 | `FORBIDDEN` | The actor passed a projection cell but may not do this. 02.1 registers `CSRF_REJECTED`, which the proxy returns before any lookup. |
   | 404 | `NOT_FOUND` | Missing, or not visible to the actor. |
   | 404 | `CAPABILITY_INVALID` | The capability expired, was revoked, or is unknown. |
   | 429 | `RATE_LIMITED` | 02.1's limiter. |
   | 503 | `POLICY_UNAVAILABLE` | A policy lookup failed. Never 404 or `false`. |

4. `NOT_FOUND` and `CAPABILITY_INVALID` bodies never vary, apart from `timestamp` and `correlationId`. The helper drops any message or details passed for them, so a hidden target answers exactly like a missing one.
5. Caller-proposed workspaces, templates and runs are checked against a server relation. Caller-asserted owner, user, role, permission or acceptance fields are rejected.
6. Bulk commands authorize each item and report a per-item `NOT_FOUND` or `FORBIDDEN` by the single-item rule. [11.1](https://github.com/keyurgolani/Checkmate/issues/59) owns bulk commit semantics.
7. Codes that predate the registry go through its legacy map, keyed by (legacy code, status, returning file). `TEMPLATE_003` is `AUTH_REQUIRED` at 401 and `FORBIDDEN` at 403. `AUTH_001` stays the sign-in failure code, since 02.1 keeps it, and is `AUTH_REQUIRED` where an `llm` or `relay` route sends it.

## Consequences

- A leaf registers its codes in `error-codes.ts` in its PR. [`error-codes.test.ts`](../../../src/lib/api/error-codes.test.ts) fails on an `*ErrorCodes` member or literal error code in `src/` that is neither registered nor in the legacy map, and on a fixed-status response the map doesn't cover.
- [21.3](https://github.com/keyurgolani/Checkmate/issues/91) moves internal routes and server actions onto the envelope. Until then legacy codes keep working through the map, and codeless error bodies under `src/app` stay on [`codeless-error-bodies.ts`](../../../src/lib/api/codeless-error-bodies.ts). 21.3 owns that list, and it only shrinks.
- 02.1 moves proxy denials onto the envelope, and [15.1](https://github.com/keyurgolani/Checkmate/issues/71) exposes it unchanged on `/api/v1`. 02.1, [03.1](https://github.com/keyurgolani/Checkmate/issues/35), 11.1 and 21.3 enforce these semantics.
