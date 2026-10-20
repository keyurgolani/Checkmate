# One revision store

- Status: Accepted
- Contract: 1.0.0
- Supersedes: none
- Superseded by: none

## Context

Runs copy mutable template items, and references read their target live ([`checklist.ts:363-433`](https://github.com/keyurgolani/Checkmate/blob/9019d176ee456477d387d821c88a7c62977eebab/src/lib/services/checklist.ts#L363-L433)). Nothing is versioned, so an installation, an include or an import has nothing fixed to point at.

## Decision

1. A deployment keeps template revisions in one store. Runs, include locks, installations and exports point at a revision, and nothing copies one within a deployment.
2. An Installation references `(revisionId, digest)` and grants read on that version's locked closure.
3. Importing from another deployment keeps the digest and the Step Keys.
4. Quarantine blocks new runs, and runs already started continue ([13.3](https://github.com/keyurgolani/Checkmate/issues/67)). This settles [#1](https://github.com/keyurgolani/Checkmate/issues/1)'s pending decision on quarantine and new runs.
5. An Update Notice has `targetKind` (`installation`, `include-lock` or `run`), `from`, `to` and `state` (`open`, `deferred`, `applied` or `superseded`). A Deferral has `notice`, `actor`, `reason` and `expiresAt`, all required. When a deferral expires, its notice is open again. [06.3](https://github.com/keyurgolani/Checkmate/issues/46) creates the collection, and [07.3](https://github.com/keyurgolani/Checkmate/issues/49) and 13.3 reuse it.

## Consequences

[04.1](https://github.com/keyurgolani/Checkmate/issues/38) builds the store, [13.1](https://github.com/keyurgolani/Checkmate/issues/65) and 13.3 the installations, 06.3 the notices, and [16.2](https://github.com/keyurgolani/Checkmate/issues/75) the import.
