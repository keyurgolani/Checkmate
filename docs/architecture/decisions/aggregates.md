# Aggregates and counters

- Status: Accepted
- Contract: 1.0.0
- Supersedes: none
- Superseded by: none

## Context

Writes carry no expected revision today, so the last write wins and nobody learns that another change landed first.

## Decision

1. An aggregate is what one command changes and checks. This contract names four:
   - Template Draft: `title`, `description`, `questions`, `resources` and the steps. Owner, workspace, tags, category, visibility, counts and ratings never bump it.
   - Run: the run and its steps.
   - Account Preferences ([17.1](https://github.com/keyurgolani/Checkmate/issues/77)).
   - Schedule ([08.2](https://github.com/keyurgolani/Checkmate/issues/51)).

   Leaves may add more. A Share Capability is not an aggregate.
2. Each aggregate has `aggregateRevision`. [11.1](https://github.com/keyurgolani/Checkmate/issues/59) bumps it once per accepted command, and it is never the revision `number`.
3. Steps carry `stepRevision`. A command that changes a step bumps it along with `aggregateRevision`.
4. Each command checks one of these before it writes:
   - `aggregateRevision`: `PublishRevision`, `StartRunFromDraft`, `RestoreRevisionToDraft`, `CompleteRun`, `ReopenRun`, `CancelRun`, `ApplyRunUpgrade` and the `MoveStep` reorder op. A draft call with several ops checks it too.
   - `stepRevision`: `SetStepState`, `DecideApproval`, `UpdateStep` and `RemoveStep`, so edits to different steps never conflict.
   - The last value the caller saw: `SetHeaderField` and `SetQuestion`. The write fails only if that field changed.
   - Nothing but the idempotency key: `AddStep`, `CreateTemplateDraft` and `CreateRun`.
5. `blueprints.version` is neither counter and carries no state. [04.1](https://github.com/keyurgolani/Checkmate/issues/38) shows the current revision's `number` in its place and drops the column.

## Consequences

The command envelope in 11.1 bumps and checks both counters, and no other writer touches them. The aggregates and what each command checks are in [`lifecycles.ts`](../../../src/lib/domain/lifecycles.ts).
