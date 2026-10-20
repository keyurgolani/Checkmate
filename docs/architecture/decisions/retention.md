# Retention

- Status: Accepted
- Contract: 1.0.0
- Supersedes: none
- Superseded by: none

## Context

At baseline, `workspaces.owner`, `blueprints.workspace` and `instances.user` cascade on delete, `blueprints.owner` and `instances.blueprint` are required, and nothing is soft-deleted or kept as history ([`pb_schema.json`](https://github.com/keyurgolani/Checkmate/blob/9019d176ee456477d387d821c88a7c62977eebab/docker/pocketbase/pb_schema.json)).

## Decision

1. DeleteAccount ([02.1](https://github.com/keyurgolani/Checkmate/issues/32)), DeleteWorkspace ([03.1](https://github.com/keyurgolani/Checkmate/issues/35)) and ArchiveTemplate ([04.3](https://github.com/keyurgolani/Checkmate/issues/40)) are soft deletes. #29 also lists transfer here, but TransferOwnership in 03.1 swaps the owner in one step and deletes nothing, so it has no purge.
2. Only the system actor purges, as a job on [12.1](https://github.com/keyurgolani/Checkmate/issues/62)'s job runtime that records a receipt event. Accounts and workspaces purge after a 30-day grace period, which operators can change in [19.2](https://github.com/keyurgolani/Checkmate/issues/84)'s config. Archived templates purge with their workspace.
3. A purged `tombstone` row keeps its id, a name snapshot and `purged`. A tombstone fires no cascade, so `restrict` targets never vanish, and the purge job deletes `operational` rows itself.
4. Relations from `history` and `proof` rows never cascade, except a run step's inside its own run. Such a row keeps a display snapshot or reads the tombstone.
5. The classes:
   - `history`: runs and run steps (`instances`, `instanceItems`) and later execution records. Removed with a receipt only by [07.2](https://github.com/keyurgolani/Checkmate/issues/48)'s `DeleteRun`, the workspace purge (which calls it) or a [12.2](https://github.com/keyurgolani/Checkmate/issues/63) retention policy job. Account and template purges only detach them.
   - `proof`: kept while referenced. Once nothing references a proof row, it is `history`, except revisions and completion records, which never leave `proof`. Content purges by [10.1](https://github.com/keyurgolani/Checkmate/issues/56) and [10.3](https://github.com/keyurgolani/Checkmate/issues/58) leave a digest.
   - `ephemeral`: deleted when its window ends. That covers [07.3](https://github.com/keyurgolani/Checkmate/issues/49)'s unapplied plans and [20.1](https://github.com/keyurgolani/Checkmate/issues/86)'s demo tenants, which go at zero grace with their own revisions and never an installed one.
   - `operational`: working state, deleted by its leaf's window or with its account, workspace or template. `items`, `collaborators` (frozen by 03.1), `notifications` and `activityLog` (dropped by 12.2).
   - `tombstone`: `users`, `workspaces` and `blueprints`. Only demo teardown and 04.3's delete of a template with no revision or reference hard-delete one.
6. Each relation change ships as a migration of its executing leaf, run by [18.2](https://github.com/keyurgolani/Checkmate/issues/81)'s migration runner:

   | Relation | Baseline | Target (executor) |
   |---|---|---|
   | `workspaces.owner`, `blueprints.workspace` | cascade | restrict (02.1, 03.1) |
   | `blueprints.owner`, `instances.user` | required; `user` cascades | detach with actor snapshot (02.1) |
   | `instances.blueprint` | required | optional, title snapshot, revision kept (07.2) |
   | `items.reference`, `instanceItems.sourceItem` | optional | detach with snapshot (04.3, 07.2) |
   | `instances.workspace`, which 18.2 adds | new | restrict, nullable (18.2) |
   | Revision and run source links | planned | restrict to a `proof` row ([04.1](https://github.com/keyurgolani/Checkmate/issues/38), 07.2) |
   | `runSources.run` | planned | detach: `DeleteRun`'s tombstone clears it (07.2) |
   | Completion record links | planned | text IDs with snapshots (10.3) |

   The other eight baseline relations keep cascade. A restrict relation is required unless its owner makes it nullable, as with a run that has no recorded revision.
7. A leaf that adds a collection or a relation adds its retention row.

## Consequences

The full matrix is in [`retention.ts`](../../../src/lib/domain/retention.ts) and the [glossary](../glossary.md#retention). `retention.test.ts` reads `pb_schema.json`, so a collection or relation without a row fails `npm test`.
