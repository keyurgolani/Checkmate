# Step and Task

- Status: Accepted
- Contract: 1.0.0
- Supersedes: none
- Superseded by: none

## Context

"Task" means two things today. `ItemType.TASK` is a step kind ([`pocketbase-types.ts:20-24`](https://github.com/keyurgolani/Checkmate/blob/9019d176ee456477d387d821c88a7c62977eebab/src/lib/pocketbase-types.ts#L20-L24)), and `Task = ChecklistItem` is a run item ([`pocketbase-types.ts:753`](https://github.com/keyurgolani/Checkmate/blob/9019d176ee456477d387d821c88a7c62977eebab/src/lib/pocketbase-types.ts#L753)). Template steps are `items` and run steps are `instanceItems`.

## Decision

1. The user label is Step. In code, a step in a draft or revision is a Step Definition ([05.1](https://github.com/keyurgolani/Checkmate/issues/41)), and a step in a run is a Run Step ([07.1](https://github.com/keyurgolani/Checkmate/issues/47)).
2. Task, Item and Module Package are retired as entity, alias and UI words. The kind key `task@1` stays and is shown as Action.
3. The kind keys are `task@1`, `instruction@1`, `section@1` and `legacy-reference@1` ([05.2](https://github.com/keyurgolani/Checkmate/issues/42)), `module-include@1` ([06.1](https://github.com/keyurgolani/Checkmate/issues/44)), `decision@1` ([08.3](https://github.com/keyurgolani/Checkmate/issues/52)), `field@1` and `evidence-request@1` ([10.1](https://github.com/keyurgolani/Checkmate/issues/56)), `approval@1` ([10.2](https://github.com/keyurgolani/Checkmate/issues/57)) and `automation@1` ([15.3](https://github.com/keyurgolani/Checkmate/issues/73)). They are permanent once [04.1](https://github.com/keyurgolani/Checkmate/issues/38) writes revisions.
4. A run step's `inclusion` is `included`, `retired` ([07.3](https://github.com/keyurgolani/Checkmate/issues/49)) or `excluded` (08.3). An upgrade whose new revision drops a step retires it, whether it was included or excluded.
5. A run step's `state` changes only through `SetStepState(desired)` from [09.1](https://github.com/keyurgolani/Checkmate/issues/53), `DecideApproval` from 10.2, or a command that causes the change. There is no `CompleteRunStep` or `ReopenRunStep`.
   - `pending` moves to `completed`, `awaiting_approval` or `excepted` through `SetStepState`. Excepting takes one of the exception kinds in 08.3: skip, not-applicable or deviation.
   - `awaiting_approval` moves to `completed` when `DecideApproval` approves, and back to `pending` with a rework reason when it rejects. A rejection also reopens the subject steps it names.
   - `completed` and `excepted` go back to `pending` through a `SetStepState` reopen. An upgrade applied with its reconfirm option reopens a changed done step the same way, until 10.2 makes that an invalidation.
   - Only an approval step is invalidated by a reopen or a rescind, and an approval step can't be excepted. A `completed` approval step moves to `invalidated` when one of its subject steps reopens or `DecideApproval` rescinds it, and a `SetStepState` reopen returns it to `pending`.
6. Reopened is an event. No lifecycle has a `reopened` state.

## Consequences

05.1 registers the kinds, 09.1 builds `SetStepState`, 10.2 adds approvals with their two states, 07.3 adds `retired`, and 08.3 adds `excluded` and `excepted`. A withdraw in 10.2 (`awaiting_approval` back to `pending`) is a minor bump that 10.2 makes itself. The full table is in [`lifecycles.ts`](../../../src/lib/domain/lifecycles.ts) and the [glossary](../glossary.md#lifecycles).
