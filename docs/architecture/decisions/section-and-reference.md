# Section and reference

- Status: Accepted
- Contract: 1.0.0
- Supersedes: none
- Superseded by: none

## Context

Steps have three item types: `task`, `reference` and `phase`. A reference step reads its target template live each time a run is created ([`checklist.ts:363-433`](https://github.com/keyurgolani/Checkmate/blob/9019d176ee456477d387d821c88a7c62977eebab/src/lib/services/checklist.ts#L363-L433)), so two runs of the same template can get different steps. Progress counts every run step, phases included ([`checklist.ts:1025-1045`](https://github.com/keyurgolani/Checkmate/blob/9019d176ee456477d387d821c88a7c62977eebab/src/lib/services/checklist.ts#L1025-L1045)).

## Decision

1. Phase becomes Section, the `section@1` kind. Sections never count toward progress.
2. A reference becomes `legacy-reference@1`. Run creation resolves it to the target's current published revision ([04.1](https://github.com/keyurgolani/Checkmate/issues/38)), and the run keeps that revision.
3. A legacy reference is never a Module Include. Converting one is an explicit [06.1](https://github.com/keyurgolani/Checkmate/issues/44) action, and it is lossy.
4. A legacy reference counts toward progress only when it has no included child steps. Excluded and retired children aren't in the run, so a reference left with only those is checkable itself.

## Consequences

[05.2](https://github.com/keyurgolani/Checkmate/issues/42) maps the item types to these kinds, and storage keeps the `phase` and `reference` values until 05.2 retires the column. 06.1 owns the conversion and its review.
