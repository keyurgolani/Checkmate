# Transformation dependency graph

<!-- Generated from dependency-graph.json by `npx tsx scripts/transformation/render.ts`. Do not edit; scripts/transformation/dependency-graph.test.ts fails when this file is stale. -->

This is the ordered, tabular form of [`dependency-graph.json`](dependency-graph.json) (CHECKMATE-01.3, #31), graph version 1. The JSON is the source and wins over any other sequencing text, #1 included.

- 282 nodes: 1 root, 4 gates, 71 leaves, 206 slices.
- 1702 edges (1702 `approved-refinement`): 492 merge-before-start, 1210 merge-before-merge.
- 0 open owner decisions, 0 dropped capability edges.

## How to read it

- **Starts after**: `merge-before-start` predecessors. The node opens no PR until they merge.
- **Merges after**: `merge-before-merge` predecessors. The node may be built in parallel but merges after them.
- A leaf with slices completes when all its slices merge; no edge enters it, and an edge leaving it waits for every slice.
- Kinds: `backend` waits for G0, `schema-changing` waits for G1, `command` waits for G2, `ui` waits for G3, `contract` waits for no gate, `ci` waits for no gate. "not G*" lists an exemption and its reason.
- Nodes are ordered by planned wave, then so that every predecessor comes first. IDs drop the `CHECKMATE-` prefix.

## Gates

| Gate | Holds when | Planned wave | Members | Nodes that wait for it |
|---|---|---|---|---|
| `G0` | 22.1 gate A: hermetic fixture and aggregate check | 0 | `22.1 · gate A` | 169 |
| `G1` | 18.2 gate 1: migration ledger | 0 | `18.2 · gate 1` | 100 |
| `G2` | 01.1 contracts and the three 01.2 slices | 1 | `01.1 · contracts`, `01.2 · envelope`, `01.2 · matrix`, `01.2 · substrate` | 86 |
| `G3` | 21.1 UI primitives | 2 | `21.1` | 128 |

## Wave 0

24 nodes.

| # | Node | Kinds | Starts after | Merges after |
|---|---|---|---|---|
| 1 | `TRACKER · Pre-0` (root)<br>Refined #1 published and the pre-gate-A owner steps |  |  | none (root) |
| 2 | `22.1 · gate A`<br>validation workflow, publish gating, PocketBase fixture | ci | `TRACKER · Pre-0` |  |
| 3 | `G0` (gate)<br>22.1 gate A: hermetic fixture and aggregate check |  |  | `22.1 · gate A` |
| 4 | `00.3 · slice A`<br>delete both routes; verified demo cleanup, opt-in demo, preflight, docs | backend, command, ui<br>not G2: Wave 0 (#1).<br>not G3: Wave 0 (#1). | `G0` |  |
| 5 | `00.3 · slice B`<br>remove the remaining bootstrap entry points<br>_Ships in one PR with `18.2 · gate 1` (#1 Wave 0 step 2)._ | backend | `G0` | `00.3 · slice A`, `22.1 · gate A` |
| 6 | `00.3` (leaf, 2 slices)<br>Replace public demo reset and setup routes with isolated lifecycle commands | backend, command, ui |  | all its slices: `00.3 · slice A`, `00.3 · slice B` |
| 7 | `07.3 · stub removal`<br>sync action, menus, route, isSynced, badges | backend, ui<br>not G3: Wave 0 (#1). | `G0` |  |
| 8 | `09.1 · slice 0`<br>toggle, rename and print fixes | backend, ui<br>not G3: Wave 0 (#1). | `G0` | `07.3 · stub removal`, `22.1 · gate A` |
| 9 | `18.2 · gate 1`<br>runner, ledger, baseline, commands, app check<br>_Ships in one PR with `00.3 · slice B` (#1 Wave 0 step 2)._ | backend, schema-changing<br>not G1: Member of G1. | `G0` | `00.3 · slice A`, `22.1 · gate A` |
| 10 | `G1` (gate)<br>18.2 gate 1: migration ledger |  |  | `18.2 · gate 1` |
| 11 | `00.4 · slice A`<br>config module, fail-closed secrets, fallback removal, docs, runbook | backend | `G0` | `00.3 · slice B`, `18.2 · gate 1` |
| 12 | `00.4 · slice B`<br>structured logger | backend | `G0` | `00.3 · slice B`, `18.2 · gate 1` |
| 13 | `00.4 · slice C`<br>security job in the 22.1 aggregate check | ci | `G0` | `00.3 · slice B`, `00.4 · slice A`, `18.2 · gate 1` |
| 14 | `00.1 · slice A`<br>matrix v1, generator, characterization tests | backend, contract | `G0`, `G1` | `00.3`, `00.4 · slice A`, `00.4 · slice B`, `00.4 · slice C` |
| 15 | `00.1 · slice B`<br>server identity, notifications, access requests stop writing | backend, schema-changing | `G0`, `G1` | `00.1 · slice A` |
| 16 | `00.1 · slice C`<br>authorProfiles and userDirectory; invite lookup, author names, signup | backend, schema-changing, ui<br>not G3: Wave 0 (#1). | `G0`, `G1` | `00.1 · slice B` |
| 17 | `00.1 · slice D`<br>security migration, caller reads, realtime filters, suite rewrites | backend, schema-changing | `G0`, `G1` | `00.1 · slice C` |
| 18 | `00.1` (leaf, 4 slices)<br>Replace permissive PocketBase rules with a default-deny authority matrix | backend, schema-changing, ui, contract |  | all its slices: `00.1 · slice A`, `00.1 · slice B`, `00.1 · slice C`, `00.1 · slice D` |
| 19 | `00.4 · slice D`<br>stored credentials and the web-tier superuser | backend, schema-changing | `G0`, `G1` | `00.1` |
| 20 | `00.4` (leaf, 4 slices)<br>Rotate defaults and add emergency security regression gates | backend, schema-changing, ci |  | all its slices: `00.4 · slice A`, `00.4 · slice B`, `00.4 · slice C`, `00.4 · slice D` |
| 21 | `18.3 · slice A`<br>backup, verify, restore drill | backend, ci | `G0`, `G1` | `00.1`, `00.4 · slice D` |
| 22 | `18.2 · gate 1 workspace`<br>instances.workspace | backend, schema-changing | `G0`, `G1` | `00.1`, `00.4 · slice D`, `18.3 · slice A` |
| 23 | `00.2` (leaf)<br>Move provider credentials into encrypted server-custodied secret references | backend, schema-changing, ui<br>not G3: Wave 0 (#1). | `G0`, `G1` | `00.1`, `00.4`, `18.2 · gate 1 workspace`, `18.3 · slice A` |
| 24 | `19.3 · upgrade note`<br>v0.2.0 upgrade note | contract | `G0`, `G1` | `00.2`, `00.3 · slice B`, `00.4`, `07.3 · stub removal`, `09.1 · slice 0`, `18.3 · slice A` |

## Wave 1

17 nodes.

| # | Node | Kinds | Starts after | Merges after |
|---|---|---|---|---|
| 25 | `01.3 · graph`<br>dependency graph, renderer, PR template | contract | `TRACKER · Pre-0` |  |
| 26 | `01.1 · contracts`<br>contract files, glossary, decision records | contract |  | `01.3 · graph` |
| 27 | `01.1 · adapter`<br>storage adapter, record types, ratchet | contract |  | `01.1 · contracts`, `01.3 · graph` |
| 28 | `01.1` (leaf, 2 slices)<br>Publish canonical domain vocabulary and lifecycle state machines | contract |  | all its slices: `01.1 · contracts`, `01.1 · adapter` |
| 29 | `01.2 · envelope`<br>error envelope and code registry | contract |  | `01.1 · contracts`, `01.3 · graph` |
| 30 | `01.2 · matrix`<br>command and projection authority matrix, principal registry | contract |  | `00.1`, `01.1 · contracts`, `01.2 · envelope`, `01.3 · graph` |
| 31 | `01.2 · substrate`<br>backend substrate decision record and spike | backend, contract | `G0`, `G1` | `00.1`, `00.2`, `01.1 · contracts`, `01.2 · envelope`, `01.3 · graph` |
| 32 | `G2` (gate)<br>01.1 contracts and the three 01.2 slices |  |  | `01.1 · contracts`, `01.2 · envelope`, `01.2 · matrix`, `01.2 · substrate` |
| 33 | `01.2` (leaf, 3 slices)<br>Specify command and projection authority for every actor type | backend, contract |  | all its slices: `01.2 · envelope`, `01.2 · matrix`, `01.2 · substrate` |
| 34 | `01.3 · map`<br>migration map and baseline inventory | contract | `G1` | `00.2`, `01.1`, `01.2` |
| 35 | `01.3` (leaf, 2 slices)<br>Create the breaking migration map and transformation dependency graph | contract |  | all its slices: `01.3 · graph`, `01.3 · map` |
| 36 | `05.1 · contract`<br>built-in manifests, legacy mapping, pure validator, released.json | contract |  | `01.1`, `01.2` |
| 37 | `19.2 · slice A`<br>typed config, env map, check registry, /api/health | backend | `G0` | `00.4`, `01.2 · substrate` |
| 38 | `20.3 · honesty`<br>false claims, name, mark, claim inventory, honest empty catalog | ui<br>not G3: Existing components (#1 G3). | `G0` | `00.3`, `00.4` |
| 39 | `22.1 · gate B`<br>lint and typecheck ratchets, dom project, audit, quarantine | ci | `00.1`, `00.2`, `00.3`, `00.4` | `22.1 · gate A` |
| 40 | `22.1` (leaf, 2 slices)<br>Add fast deterministic PR validation with hermetic backend fixtures | ci |  | all its slices: `22.1 · gate A`, `22.1 · gate B` |
| 41 | `16.2 · v1 repair`<br>v1 export and import repair, golden fixtures, starter workflow | backend, ui<br>not G3: Wave 1 repair of the existing export dialog (#75 ships it in `v0.3.0`), before G3. | `G0`, `G1` | `00.4`, `22.1` |

## Wave 2

49 nodes.

| # | Node | Kinds | Starts after | Merges after |
|---|---|---|---|---|
| 42 | `05.3 · characterization`<br>characterization cases and declared deltas | ci |  | `16.2 · v1 repair`, `22.1` |
| 43 | `12.1 · slice A`<br>event log, genesis, collaboration events | backend, schema-changing, command | `G0`, `G1`, `G2` | `00.1`, `00.4`, `18.2 · gate 1 workspace` |
| 44 | `12.1 · slice B`<br>checkpoints, job runtime, worker | backend, schema-changing, command | `G0`, `G1`, `G2` | `12.1 · slice A` |
| 45 | `12.1` (leaf, 2 slices)<br>Add domain events and a transactional outbox | backend, schema-changing, command |  | all its slices: `12.1 · slice A`, `12.1 · slice B` |
| 46 | `19.1 · fonts`<br>vendored theme fonts | ci | `TRACKER · Pre-0` |  |
| 47 | `19.2 · slice B`<br>readiness, bootstrap, CLI | backend | `G0`, `G1` | `00.1`, `00.3`, `19.2 · slice A` |
| 48 | `19.1 · slice 1`<br>images, runtime public config, compose | backend | `G0`, `G1` | `00.1`, `00.2`, `00.3`, `00.4`, `12.1 · slice B`, `18.3 · slice A`, `19.2 · slice A`, `19.2 · slice B` |
| 49 | `21.1 · tokens`<br>motion seam, hit areas, focus, IconButton, lint rules, register | ui, ci<br>not G3: Member of G3. |  | `22.1 · gate B` |
| 50 | `21.1 · shell`<br>nav registry, skip links, scroll padding, route focus | ui<br>not G3: Member of G3. |  | `01.1`, `21.1 · tokens` |
| 51 | `21.1 · patterns`<br>focus return, announcer, confirmation, ActionGroup, charts | ui<br>not G3: Member of G3. |  | `21.1 · tokens` |
| 52 | `22.2 · a1`<br>security policy, audit, EOL, Dependabot, nightly | ci | `G0` | `22.1 · gate B` |
| 53 | `22.2 · a2`<br>secret scan and SAST | ci | `G0` | `00.4 · slice C` |
| 54 | `22.2 · b1`<br>browser harness and smoke | ci | `G0`, `G1` | `00.3`, `09.1 · slice 0`, `21.1 · tokens`, `22.1 · gate B` |
| 55 | `22.2 · b2`<br>kernel journeys | ci | `G0` | `22.2 · b1` |
| 56 | `22.2 · b3`<br>scale fixture | ci | `G0` | `22.2 · b1` |
| 57 | `21.1 · browser`<br>390px, zoom, forced-colors and reduced-motion smoke | ui, ci<br>not G3: Member of G3. |  | `21.1 · tokens`, `21.1 · shell`, `21.1 · patterns`, `22.2 · b1`, `22.2 · b2`, `22.2 · b3` |
| 58 | `21.1` (leaf, 4 slices)<br>Define shared responsive, focus, target-size, and motion primitives | ui, ci |  | all its slices: `21.1 · tokens`, `21.1 · shell`, `21.1 · patterns`, `21.1 · browser` |
| 59 | `G3` (gate)<br>21.1 UI primitives |  |  | `21.1` |
| 60 | `05.2 · slice 1`<br>run progress function, rewired writers, completion guard | backend, schema-changing, ui | `G0`, `G1`, `G3` | `01.1`, `05.1 · contract`, `05.3 · characterization`, `12.1 · slice A`, `18.3 · slice A`, `22.1` |
| 61 | `21.2 · names`<br>accessible names and reveal | ui | `G3` | `09.1 · slice 0`, `22.1 · gate B`, `22.2 · b1`, `22.2 · b2`, `22.2 · b3` |
| 62 | `21.2 · shell`<br>route moves, redirects, Settings and Activity section navs | ui | `G3` | `01.1`, `21.2 · names` |
| 63 | `21.2 · cleanup`<br>gradient removal, hidden dead controls, EmptyState action | ui | `G3` | `21.2 · names` |
| 64 | `21.3 · model`<br>state types, mapping, StateView, InlineError, ConflictView | ui, contract | `G3` | `01.2 · envelope`, `09.1 · slice 0`, `18.2 · gate 1 workspace`, `22.1 · gate B` |
| 65 | `21.3 · reads`<br>Result conversions, callers, fetchedAt | backend | `G0` | `00.4`, `21.3 · model` |
| 66 | `21.3 · surfaces`<br>templates, runs, dashboard, notifications, summary route | ui | `G3` | `21.3 · reads` |
| 67 | `21.3 · editor and live`<br>editor command states, connection seam, indicators | ui | `G3` | `21.3 · surfaces`, `22.2 · b1`, `22.2 · b2`, `22.2 · b3` |
| 68 | `21.3` (leaf, 4 slices)<br>Standardize truthful async, stale, degraded, conflict, and recovery states | backend, ui, contract |  | all its slices: `21.3 · model`, `21.3 · reads`, `21.3 · surfaces`, `21.3 · editor and live` |
| 69 | `21.2 · tracker`<br>tracker controls, nesting and focus | ui | `G3` | `09.1 · slice 0`, `21.3`, `22.1 · gate B`, `22.2 · b1`, `22.2 · b2`, `22.2 · b3` |
| 70 | `21.2 · editor`<br>editor title, actions, rows and confirmations | ui | `G3` | `09.1 · slice 0`, `21.3`, `22.1 · gate B`, `22.2 · b1`, `22.2 · b2`, `22.2 · b3` |
| 71 | `21.2` (leaf, 5 slices)<br>Repair core authoring and execution accessibility | ui |  | all its slices: `21.2 · names`, `21.2 · tracker`, `21.2 · editor`, `21.2 · shell`, `21.2 · cleanup` |
| 72 | `02.1 · slice B`<br>rate limits, throttle, resolver, sessions, cookie modes, proxy, CSRF, legacy cookies | backend, schema-changing, command | `G0`, `G1`, `G2`, `G3` | `00.1`, `00.2`, `00.3`, `00.4`, `01.1`, `01.2`, `12.1 · slice A`, `19.2 · slice A`, `21.2`, `21.3`, `22.2 · b1`, `22.2 · b2`, `22.2 · b3` |
| 73 | `02.1 · slice C`<br>notification routes, SSE relay, cut-over | backend, ui | `G0`, `G3` | `02.1 · slice B` |
| 74 | `02.1 · slice D`<br>assurance, password, recovery, Settings → Security | backend, command, ui | `G0`, `G2`, `G3` | `02.1 · slice B` |
| 75 | `02.3 · slice 1`<br>token primitive, collections, storage rows, deployment principal | backend, schema-changing, command | `G0`, `G1`, `G2` | `00.1`, `00.4`, `01.1`, `02.1 · slice B`, `02.1 · slice D`, `12.1 · slice A`, `19.2 · slice A` |
| 76 | `11.1 · module`<br>command module, counters and ledger | backend, schema-changing, command | `G0`, `G1`, `G2` | `00.1`, `00.4`, `01.1`, `02.1 · slice B`, `09.1 · slice 0`, `12.1`, `18.2 · gate 1 workspace`, `19.2 · slice A` |
| 77 | `02.3 · slice 2`<br>resolver, /api/v{n} rule, introspection, management routes, scopes, limits, events | backend, command | `G0`, `G2` | `02.3 · slice 1`, `11.1 · module` |
| 78 | `02.3 · slice 3`<br>token management UI | ui | `G3` | `02.3 · slice 2`, `21.2`, `21.3`, `22.2 · b1` |
| 79 | `02.3` (leaf, 3 slices)<br>Add scoped API tokens and service identities | backend, schema-changing, command, ui |  | all its slices: `02.3 · slice 1`, `02.3 · slice 2`, `02.3 · slice 3` |
| 80 | `11.1 · template`<br>template-side keys, tokens and stale notice | backend, ui | `G0`, `G3` | `11.1 · module`, `21.3`, `22.1 · gate B`, `22.2 · b1`, `22.2 · b2`, `22.2 · b3` |
| 81 | `11.1 · run`<br>run-side keys, tokens and stale notice | backend, ui | `G0`, `G3` | `05.2 · slice 1`, `11.1 · module`, `21.3`, `22.1 · gate B`, `22.2 · b1`, `22.2 · b2`, `22.2 · b3` |
| 82 | `11.1` (leaf, 3 slices)<br>Add expected revisions, idempotency, and typed conflict responses | backend, schema-changing, command, ui |  | all its slices: `11.1 · module`, `11.1 · template`, `11.1 · run` |
| 83 | `02.2 · slice A`<br>Secret Reference lifecycle, resolver, inventory, checks, secret-encryption key | backend, schema-changing, command, ui | `G0`, `G1`, `G2`, `G3` | `00.2`, `01.1`, `01.2`, `02.1 · slice B`, `11.1`, `12.1 · slice A`, `19.2 · slice A`, `19.2 · slice B`, `21.2`, `21.3`, `22.2 · b1`, `22.2 · b2`, `22.2 · b3` |
| 84 | `02.2 · slice B`<br>signing and backup-recipient keys, relay-token, checkmate keys, GET /api/keys<br>_#33 allows Wave 5 at the latest, before `16.1 · envelope` and 13.1._ | backend, command | `G0`, `G2` | `02.2 · slice A` |
| 85 | `02.2` (leaf, 2 slices)<br>Add encrypted secret references and provider credential lifecycle | backend, schema-changing, command, ui |  | all its slices: `02.2 · slice A`, `02.2 · slice B` |
| 86 | `18.1 · slice a`<br>query module, cursor, read inventory, index migrations | backend, schema-changing | `G0`, `G1`, `G3` | `00.1`, `01.2`, `02.1 · slice B`, `18.2 · gate 1 workspace`, `19.2 · slice A`, `21.3`, `22.2 · b3` |
| 87 | `18.1 · slice b`<br>runs, templates and workspaces surfaces | backend, ui | `G0`, `G3` | `18.1 · slice a` |
| 88 | `18.1 · slice c`<br>notifications, search and categories | backend, ui | `G0`, `G3` | `02.1 · slice C`, `18.1 · slice a` |
| 89 | `18.1` (leaf, 3 slices)<br>Replace unbounded and N-plus-one paths with indexed cursor queries | backend, schema-changing, ui |  | all its slices: `18.1 · slice a`, `18.1 · slice b`, `18.1 · slice c` |
| 90 | `22.4 · CI health`<br>metrics action, test reports, weekly report | ci | `G0` | `22.1 · gate B` |

## Wave 3

44 nodes.

| # | Node | Kinds | Starts after | Merges after |
|---|---|---|---|---|
| 91 | `03.1 · policy`<br>decide(), CreateWorkspace, UpdateWorkspace, owner Memberships | backend, schema-changing, command | `G0`, `G1`, `G2`, `G3` | `00.1`, `01.1`, `01.2`, `02.1 · slice B`, `02.3`, `11.1`, `12.1 · slice A`, `18.1`, `18.2 · gate 1 workspace`, `21.3`, `22.1`, `22.2 · b1`, `22.2 · b2`, `22.2 · b3` |
| 92 | `03.1 · members`<br>service principals, invitations, roles, removal, administration | backend, schema-changing, command, ui | `G0`, `G1`, `G2`, `G3` | `03.1 · policy`, `19.2 · slice A` |
| 93 | `03.1 · grants`<br>template Grants, collaborator migration, Share surface | backend, schema-changing, command, ui | `G0`, `G1`, `G2`, `G3` | `03.1 · members` |
| 94 | `03.1 · lifecycle`<br>transfer, archive, unarchive, delete, purge job | backend, schema-changing, command, ui | `G0`, `G1`, `G2`, `G3` | `03.1 · grants`, `12.1 · slice B` |
| 95 | `02.1 · slice E`<br>DeleteAccount, account purge, OAuth removal<br>_Wave 3: it needs `03.1 · lifecycle`._ | backend, schema-changing, command, ui | `G0`, `G1`, `G2`, `G3` | `02.1 · slice D`, `03.1 · lifecycle`, `12.1 · slice B` |
| 96 | `03.1` (leaf, 4 slices)<br>Create workspace memberships and policy-backed roles | backend, schema-changing, command, ui |  | all its slices: `03.1 · policy`, `03.1 · members`, `03.1 · grants`, `03.1 · lifecycle` |
| 97 | `03.2 · participants`<br>participant records, run roles, owner migration, decide() on run paths | backend, schema-changing, command, ui | `G0`, `G1`, `G2`, `G3` | `00.1`, `01.1`, `01.2`, `02.1 · slice B`, `02.3`, `03.1 · policy`, `03.1 · members`, `03.1 · grants`, `11.1`, `12.1 · slice A`, `18.1`, `19.2 · slice A`, `21.3`, `22.1`, `22.2 · b1`, `22.2 · b2`, `22.2 · b3` |
| 98 | `03.3 · primitive`<br>capability collection, registry, commands, exchange, holder sessions, events | backend, schema-changing, command | `G0`, `G1`, `G2`, `G3` | `01.1`, `01.2`, `02.1 · slice B`, `02.1 · slice C`, `02.3`, `03.1`, `03.2 · participants`, `11.1`, `12.1 · slice A`, `19.2 · slice A`, `21.3`, `22.1`, `22.2 · b1`, `22.2 · b2`, `22.2 · b3` |
| 99 | `03.3 · progress`<br>run-progress@1, holder view, events route, link UI | backend, ui | `G0`, `G3` | `03.3 · primitive`, `05.2 · slice 1` |
| 100 | `04.1 · storage`<br>migrations, preflight, Step Key backfill, digest, registry, revision 1 | backend, schema-changing, command | `G0`, `G1`, `G2`, `01.1 · adapter` | `00.1`, `02.1 · slice B`, `12.1 · slice A`, `16.2 · v1 repair`, `22.1` |
| 101 | `04.1 · commands`<br>applyDraftCommands, draft writers rewired, old routes removed | backend, command, ui | `G0`, `G2`, `G3` | `04.1 · storage`, `11.1` |
| 102 | `04.1 · release`<br>minimal PublishRevision, run pointer, read switch, editor header | backend, schema-changing, command, ui | `G0`, `G1`, `G2`, `G3` | `04.1 · commands` |
| 103 | `04.1` (leaf, 3 slices)<br>Split template identity, editable draft, and immutable revision storage | backend, schema-changing, command, ui |  | all its slices: `04.1 · storage`, `04.1 · commands`, `04.1 · release` |
| 104 | `04.2 · core`<br>validation, diff, apply, hooks, limits, preflight, shadow mode | backend | `G0`, `G1`, `G3` | `00.4`, `01.1`, `01.2`, `04.1`, `05.1 · contract`, `11.1`, `21.2`, `21.3`, `22.1 · gate B`, `22.2 · b1`, `22.2 · b2`, `22.2 · b3` |
| 105 | `04.2 · publish`<br>PublishRevision replaces the minimal publish; enforcement on | backend, command | `G0`, `G2` | `04.2 · core` |
| 106 | `04.2 · review`<br>authoring layout and ChangeSetReview | ui | `G3` | `04.2 · core` |
| 107 | `04.2` (leaf, 3 slices)<br>Add deterministic validation, semantic diff, and publish workflow | backend, command, ui |  | all its slices: `04.2 · core`, `04.2 · publish`, `04.2 · review` |
| 108 | `03.3 · template`<br>template-revision@1 read and copy | backend, command, ui | `G0`, `G2`, `G3` | `03.3 · progress`, `04.2` |
| 109 | `03.3` (leaf, 3 slices)<br>Add expiring progress and completion-record capabilities | backend, schema-changing, command, ui |  | all its slices: `03.3 · primitive`, `03.3 · progress`, `03.3 · template` |
| 110 | `04.3 · archive`<br>lifecycle storage, archive, restricted delete, detach, run guard | backend, schema-changing, command, ui | `G0`, `G1`, `G2`, `G3` | `01.1`, `01.2`, `02.1 · slice B`, `03.1`, `04.1`, `11.1`, `12.1 · slice A`, `21.2`, `21.3`, `22.1` |
| 111 | `04.3 · history`<br>history, revision view and print, run source view, deprecation | backend, command, ui | `G0`, `G2`, `G3` | `04.3 · archive` |
| 112 | `04.3 · rollback`<br>RollbackToRevision, restore to draft, compare with current | backend, command, ui | `G0`, `G2`, `G3` | `04.2`, `04.3 · history` |
| 113 | `04.3` (leaf, 3 slices)<br>Add deprecation, rollback, and historical rendering | backend, schema-changing, command, ui |  | all its slices: `04.3 · archive`, `04.3 · history`, `04.3 · rollback` |
| 114 | `07.2 · contract`<br>run source storage, write protection, RunCreated, projections, tombstone | backend, schema-changing, command | `G0`, `G1`, `G2` | `01.1`, `01.2`, `04.1`, `11.1`, `12.1 · slice A` |
| 115 | `07.1 · core`<br>CreateRun and StartRunFromDraft, entry points, legacy writer removed | backend, command, ui | `G0`, `G1`, `G2`, `G3` | `00.1`, `00.4`, `01.1`, `04.1`, `04.3`, `07.2 · contract`, `11.1`, `12.1 · slice A`, `18.2 · gate 1 workspace` |
| 116 | `07.1 · setup`<br>one Configure-run surface, section registry, bulk outcomes | backend, ui | `G0`, `G3` | `07.1 · core`, `07.2 · contract`, `21.3`, `22.1 · gate B` |
| 117 | `09.1 · SetStepState`<br>SetStepState replaces every step writer | backend, schema-changing, command, ui | `G0`, `G1`, `G2`, `G3` | `01.1`, `01.2 · substrate`, `05.2 · slice 1`, `07.1 · core`, `09.1 · slice 0`, `11.1`, `12.1 · slice A` |
| 118 | `03.2 · guests`<br>guest principals, redemption, sessions, (guest) routes | backend, schema-changing, command, ui | `G0`, `G1`, `G2`, `G3` | `02.1 · slice E`, `03.2 · participants`, `03.3 · primitive`, `09.1 · SetStepState` |
| 119 | `08.1 · slice 0`<br>owner Today: next step, in-progress and recently resumed sections | backend, ui | `G0`, `G3` | `01.1`, `03.1 · policy`, `03.1 · members`, `03.2 · participants`, `05.2 · slice 1`, `07.2 · contract`, `09.1 · SetStepState`, `18.1`, `21.2`, `21.3`, `22.1 · gate B`, `22.2 · b1`, `22.2 · b2`, `22.2 · b3` |
| 120 | `16.2 · v1 keys`<br>v1 exporter writes stepKey | backend | `G0` | `01.1`, `04.1 · storage`, `16.2 · v1 repair` |
| 121 | `17.2 · schema`<br>AppearanceV1, parsing, resolution, contrast fixes, safe theme | ui | `G3` | `01.1`, `01.2 · substrate`, `22.1 · gate B` |
| 122 | `17.1 · resolver`<br>preference registry, resolver, read-only inspector | ui | `G3` | `01.2`, `17.2 · schema`, `22.1 · gate B` |
| 123 | `17.1 · workspace`<br>workspace policy layer and its editor | backend, command, ui | `G0`, `G2`, `G3` | `03.1`, `17.1 · resolver` |
| 124 | `17.2 · scoped`<br>applyAppearance, generated CSS, local fonts, scoped dark | ui | `G3` | `17.2 · schema`, `19.1 · fonts` |
| 125 | `17.1 · account`<br>account record, commands, device layer, server rendering | backend, schema-changing, command, ui | `G0`, `G1`, `G2`, `G3` | `01.1`, `02.1 · slice B`, `11.1`, `12.1 · slice A`, `17.1 · resolver`, `17.2 · scoped`, `21.3`, `22.2 · b1`, `22.2 · b2`, `22.2 · b3` |
| 126 | `17.1 · registry`<br>timezone, dateFormat, notificationDelivery, defaultWorkspace | backend, ui | `G0`, `G3` | `03.1`, `17.1 · account` |
| 127 | `17.2` (leaf, 2 slices)<br>Formalize composable theme axes, tokens, constraints, and presets | ui |  | all its slices: `17.2 · schema`, `17.2 · scoped` |
| 128 | `17.3 · safe`<br>safe mode, preview, device Apply, undoable reset | ui | `G3` | `17.1 · resolver`, `17.2`, `21.2`, `21.3`, `22.1 · gate B`, `22.2 · b1`, `22.2 · b2`, `22.2 · b3` |
| 129 | `17.3 · migrate`<br>account scope and the migration inspector | ui | `G3` | `17.1 · account`, `17.3 · safe` |
| 130 | `17.3 · files`<br>preset import and export | ui | `G3` | `04.1`, `17.3 · migrate` |
| 131 | `17.3` (leaf, 3 slices)<br>Add isolated preview, migration inspector, import, export, and safe reset | ui |  | all its slices: `17.3 · safe`, `17.3 · migrate`, `17.3 · files` |
| 132 | `19.2 · slice C`<br>first-operator token | backend, schema-changing, command, ui | `G0`, `G1`, `G2`, `G3` | `01.2 · matrix`, `02.1 · slice B`, `02.3 · slice 1`, `03.1`, `12.1 · slice A`, `19.2 · slice B` |
| 133 | `20.1 · isolation`<br>isolated demo tenants, all but the starter | backend, schema-changing, command, ui | `G0`, `G1`, `G2`, `G3` | `00.1`, `00.3`, `00.4`, `01.1`, `01.2`, `02.1 · slice B`, `02.1 · slice E`, `03.1`, `07.1 · core`, `09.1 · slice 0`, `09.1 · SetStepState`, `11.1`, `12.1 · slice B`, `17.1 · account`, `18.3 · slice A`, `19.2 · slice A`, `21.3`, `22.1`, `22.2 · b1`, `22.2 · b2`, `22.2 · b3` |
| 134 | `20.2 · workspace`<br>EnsurePersonalWorkspace in signup and template save | backend, command, ui | `G0`, `G2`, `G3` | `00.1 · slice C`, `03.1 · policy`, `11.1`, `21.3 · surfaces` |

## Wave 4

9 nodes.

| # | Node | Kinds | Starts after | Merges after |
|---|---|---|---|---|
| 135 | `05.1 · enforcement`<br>validator calls in commands, editor fixes, catalog, renderer map | backend, ui | `G0`, `G3` | `00.1`, `00.4 · slice B`, `01.2 · substrate`, `04.1 · commands`, `05.1 · contract`, `22.1 · gate B` |
| 136 | `05.1` (leaf, 2 slices)<br>Define versioned step capability manifests and registry | backend, ui, contract |  | all its slices: `05.1 · contract`, `05.1 · enforcement` |
| 137 | `05.3 · suite`<br>conformance suite over every registered kind | ci |  | `01.2`, `04.1 · release`, `04.2 · core`, `05.1 · enforcement`, `07.1 · core`, `12.1 · slice A`, `22.2 · b1`, `22.2 · b2`, `22.2 · b3` |
| 138 | `05.2 · envelope`<br>domain and storage fields, expand migration, backfill | backend, schema-changing | `G0`, `G1` | `04.1 · commands`, `05.1 · enforcement`, `05.3 · suite`, `07.1 · core`, `16.2 · v1 repair`, `16.2 · v1 keys`, `18.3 · slice A`, `19.2 · slice A` |
| 139 | `05.2 · extraction`<br>registry lookups replace kind branches | backend, ui | `G0`, `G3` | `04.2`, `05.2 · envelope`, `21.2` |
| 140 | `05.3` (leaf, 2 slices)<br>Add conformance tooling for editor, run, event, export, and accessibility | ci |  | all its slices: `05.3 · characterization`, `05.3 · suite` |
| 141 | `22.2 · c1`<br>migration matrix legs | ci | `G0` | `18.2 · gate 1`, `18.3 · slice A` |
| 142 | `22.2 · c2`<br>release legs and the deletion case | ci | `G0` | `01.1`, `02.1 · slice E`, `03.1 · lifecycle`, `07.2 · contract`, `19.2 · slice A`, `19.2 · slice B`, `22.2 · c1` |
| 143 | `22.2` (leaf, 7 slices)<br>Add migration, browser, accessibility, and security risk gates | ci |  | all its slices: `22.2 · a1`, `22.2 · a2`, `22.2 · b1`, `22.2 · b2`, `22.2 · b3`, `22.2 · c1`, `22.2 · c2` |

## Wave 5

30 nodes.

| # | Node | Kinds | Starts after | Merges after |
|---|---|---|---|---|
| 144 | `05.2 · retire-itemType`<br>drop itemType; instruction@1 becomes creatable | backend, schema-changing, ui | `G0`, `G1`, `G3` | `04.2 · publish`, `05.2 · envelope`, `18.3 · slice A` |
| 145 | `05.2` (leaf, 4 slices)<br>Migrate current task variants into registry-backed built-ins | backend, schema-changing, ui |  | all its slices: `05.2 · slice 1`, `05.2 · envelope`, `05.2 · extraction`, `05.2 · retire-itemType` |
| 146 | `06.1 · includes`<br>capability, lock, templateKey, resolver, CreateRun branch, picker | backend, schema-changing, command, ui | `G0`, `G1`, `G2`, `G3` | `00.4`, `01.1`, `01.2`, `03.1`, `04.1`, `04.2`, `04.3`, `05.1`, `05.2 · retire-itemType`, `05.3`, `07.1 · core`, `11.1`, `12.1 · slice A`, `18.1`, `21.3`, `22.1 · gate B` |
| 147 | `06.1 · convert`<br>ConvertReferenceToInclude and the candidate report | backend, command, ui | `G0`, `G2`, `G3` | `06.1 · includes` |
| 148 | `06.1` (leaf, 2 slices)<br>Model module packages, includes, and immutable dependency locks | backend, schema-changing, command, ui |  | all its slices: `06.1 · includes`, `06.1 · convert` |
| 149 | `06.2 · parameters`<br>parameter schema, upcaster, draft ops, Inputs manager, root inputs | backend, schema-changing, command, ui | `G0`, `G1`, `G2`, `G3` | `01.1`, `01.2`, `03.1`, `04.1`, `04.2`, `05.1`, `05.2`, `06.1`, `07.1 · core`, `21.3`, `22.1` |
| 150 | `06.2 · bindings`<br>module-include@2, bindings panel, validateBindings, resolveBindings | backend, command, ui | `G0`, `G2`, `G3` | `06.2 · parameters` |
| 151 | `06.2 · slots`<br>Role Slot, Roles manager, slot mapping | backend, schema-changing, command, ui | `G0`, `G1`, `G2`, `G3` | `06.2 · bindings` |
| 152 | `03.2 · slots`<br>binding record, validator, live-run binding, Configure-run section<br>_Wave 5: it needs `06.2 · slots`._ | backend, schema-changing, command, ui | `G0`, `G1`, `G2`, `G3` | `02.1 · slice E`, `03.2 · participants`, `06.2 · slots`, `07.1 · core`, `07.1 · setup` |
| 153 | `03.2` (leaf, 3 slices)<br>Add run participants, guests, and role-slot assignments | backend, schema-changing, command, ui |  | all its slices: `03.2 · participants`, `03.2 · guests`, `03.2 · slots` |
| 154 | `06.2` (leaf, 3 slices)<br>Add typed parameters and role-slot binding | backend, schema-changing, command, ui |  | all its slices: `06.2 · parameters`, `06.2 · bindings`, `06.2 · slots` |
| 155 | `06.3 · inspect`<br>dependency tree, dependents, legacy index, non-upgrade states | backend, ui | `G0`, `G1`, `G3` | `01.1`, `01.2`, `03.1`, `04.1`, `04.2`, `04.3`, `05.1`, `06.1 · includes`, `11.1`, `12.1 · slice A`, `18.1`, `21.3`, `22.1`, `22.2 · b1`, `22.2 · b2`, `22.2 · b3` |
| 156 | `06.3 · upgrade`<br>classifier, plan, review, acknowledgment, deferral, Library Updates | backend, schema-changing, command, ui | `G0`, `G1`, `G2`, `G3` | `04.2`, `04.3`, `06.2`, `06.3 · inspect` |
| 157 | `06.3 · ranges`<br>module-include@3, SetInclude constraint, resolution at publish | backend, command | `G0`, `G2` | `06.3 · upgrade` |
| 158 | `06.3 · fragments`<br>exact-match module suggestions | backend, ui | `G0`, `G3` | `06.3 · ranges` |
| 159 | `06.3` (leaf, 4 slices)<br>Add dependency inspection and reviewable module upgrades | backend, schema-changing, command, ui |  | all its slices: `06.3 · inspect`, `06.3 · upgrade`, `06.3 · ranges`, `06.3 · fragments` |
| 160 | `14.1 · slice A`<br>adapter registry, typed model listing, egressFetch | backend | `G0`, `G1`, `G3` | `00.1`, `00.2`, `00.4`, `01.2`, `01.3`, `02.1 · slice B`, `02.2 · slice A`, `12.1`, `19.2 · slice A`, `21.2`, `21.3` |
| 161 | `14.1 · slice B`<br>configuration records, backfill, server resolution, Integrations panel | backend, schema-changing, command, ui | `G0`, `G1`, `G2`, `G3` | `14.1 · slice A`, `22.2 · b1`, `22.2 · b2`, `22.2 · b3` |
| 162 | `14.1 · slice C`<br>browser provider relay on invocation records | backend, schema-changing, ui | `G0`, `G1`, `G3` | `14.1 · slice B` |
| 163 | `14.3 · slice A`<br>receipts, prompt registry, redaction, cancellation, receipt list | backend, schema-changing, command, ui | `G0`, `G1`, `G2`, `G3` | `00.1`, `00.2`, `00.4`, `01.1`, `01.2`, `02.1 · slice B`, `02.1 · slice E`, `04.1`, `11.1`, `12.1`, `14.1 · slice A`, `14.1 · slice C`, `18.1`, `19.2 · slice A`, `21.2`, `21.3`, `22.1` |
| 164 | `14.3 · slice B`<br>budgets, cost, provider health | backend, schema-changing, ui | `G0`, `G1`, `G3` | `14.3 · slice A` |
| 165 | `14.3 · slice C`<br>summary receipts and the dashboard summary cutover | backend, schema-changing, ui | `G0`, `G1`, `G3` | `08.1 · slice 0`, `14.3 · slice B` |
| 166 | `14.3` (leaf, 3 slices)<br>Add invocation receipts, budgets, cancellation, and provider health | backend, schema-changing, command, ui |  | all its slices: `14.3 · slice A`, `14.3 · slice B`, `14.3 · slice C` |
| 167 | `14.2 · research`<br>research artifacts and states | backend, schema-changing, command, ui | `G0`, `G1`, `G2`, `G3` | `12.1`, `14.3` |
| 168 | `14.2 · step`<br>improve-step and rebase | backend, command, ui | `G0`, `G2`, `G3` | `01.2`, `04.1`, `04.2`, `05.1`, `05.2`, `11.1`, `12.1 · slice A`, `14.2 · research`, `19.2 · slice A`, `21.3`, `22.1 · gate B`, `22.2 · b1`, `22.2 · b2`, `22.2 · b3` |
| 169 | `14.2 · template`<br>improve-template and enhance | backend, command, ui | `G0`, `G2`, `G3` | `14.2 · step` |
| 170 | `14.2 · generate`<br>generate, with the manual-alternative check | backend, command, ui | `G0`, `G2`, `G3` | `14.2 · template` |
| 171 | `14.2` (leaf, 4 slices)<br>Add retained research artifacts and typed generation proposals | backend, schema-changing, command, ui |  | all its slices: `14.2 · research`, `14.2 · step`, `14.2 · template`, `14.2 · generate` |
| 172 | `16.1 · envelope`<br>envelope, strict parser, key set, verify(), negotiation, limits | backend, contract | `G0` | `01.1`, `01.2`, `02.2 · slice B`, `04.1`, `04.2`, `05.1`, `05.2`, `06.1 · includes`, `07.1 · core`, `16.2 · v1 repair`, `19.2 · slice A`, `22.1` |
| 173 | `16.1 · workflow`<br>workflow and package documents, bundle schema, 1.x reader | backend, contract | `G0` | `16.1 · envelope` |

## Wave 6

17 nodes.

| # | Node | Kinds | Starts after | Merges after |
|---|---|---|---|---|
| 174 | `07.1 · binding`<br>role slots validated; parameter values and bindings persisted | backend, schema-changing, command | `G0`, `G1`, `G2` | `03.2 · slots`, `06.2` |
| 175 | `07.1` (leaf, 3 slices)<br>Implement idempotent transactional run creation | backend, schema-changing, command, ui |  | all its slices: `07.1 · core`, `07.1 · setup`, `07.1 · binding` |
| 176 | `07.2 · lineage`<br>runLineage backfill, seven surfaces, source@1, verify check | backend, schema-changing, ui | `G0`, `G1`, `G3` | `01.3 · map`, `03.1`, `03.2`, `03.3`, `04.3`, `05.2`, `07.1 · core`, `07.2 · contract`, `22.1 · gate B` |
| 177 | `07.2` (leaf, 2 slices)<br>Persist complete run source and configuration provenance | backend, schema-changing, command, ui |  | all its slices: `07.2 · contract`, `07.2 · lineage` |
| 178 | `07.3 · plan`<br>upgrade plans, policies, contributor hook, review, deferral | backend, schema-changing, command, ui | `G0`, `G1`, `G2`, `G3` | `01.1`, `01.2`, `03.1`, `04.2`, `04.3`, `05.1`, `05.2`, `06.1`, `06.2`, `06.3`, `07.1`, `07.2`, `07.3 · stub removal`, `09.1 · SetStepState`, `11.1`, `12.1 · slice A`, `21.3`, `22.1` |
| 179 | `07.3 · apply`<br>apply, RunSource chain, retired steps, reversal | backend, schema-changing, command, ui | `G0`, `G1`, `G2`, `G3` | `07.3 · plan` |
| 180 | `07.3` (leaf, 3 slices)<br>Replace sync stubs with dry-run and apply upgrade plans | backend, schema-changing, command, ui |  | all its slices: `07.3 · stub removal`, `07.3 · plan`, `07.3 · apply` |
| 181 | `13.1 · contracts`<br>package records, VerifyPackage, commands, first-party publishing | backend, schema-changing, command, ui | `G0`, `G1`, `G2`, `G3` | `00.1`, `01.1`, `01.2`, `02.2 · slice B`, `03.1`, `04.1`, `04.2`, `04.3`, `05.1`, `06.1`, `06.3`, `11.1`, `12.1 · slice A`, `16.1 · envelope`, `16.1 · workflow`, `19.2 · slice A`, `21.3`, `22.1` |
| 182 | `13.1 · unlisting`<br>legacy migration, listing reads, Library notice<br>_Ships with `13.3 · install` (#65)._ | backend, schema-changing, ui | `G0`, `G1`, `G3` | `13.1 · contracts`, `16.2 · v1 repair`, `18.3 · slice A`, `20.3 · honesty` |
| 183 | `13.1` (leaf, 2 slices)<br>Define signed portable catalog package and installation contracts | backend, schema-changing, command, ui |  | all its slices: `13.1 · contracts`, `13.1 · unlisting` |
| 184 | `13.3 · install`<br>install and start from a verified package | backend, schema-changing, command, ui | `G0`, `G1`, `G2`, `G3` | `01.1`, `01.2`, `02.2 · slice B`, `03.1`, `04.1`, `04.3`, `06.1`, `07.1 · core`, `07.1 · binding`, `07.2`, `13.1`, `16.1 · workflow`, `16.2 · v1 repair` |
| 185 | `14.1 · slice D`<br>delete users.preferences.llmSettings<br>_The release tag after slice B (#68)._ | backend, schema-changing | `G0`, `G1` | `14.1 · slice B` |
| 186 | `14.1` (leaf, 4 slices)<br>Create provider adapters, capability negotiation, and safe secret custody | backend, schema-changing, command, ui |  | all its slices: `14.1 · slice A`, `14.1 · slice B`, `14.1 · slice C`, `14.1 · slice D` |
| 187 | `20.1 · starter`<br>starter install, isolated for operators, shared retired | backend, ui | `G0`, `G3` | `13.1`, `13.3 · install`, `16.2 · v1 repair`, `20.1 · isolation` |
| 188 | `17.1 · retire`<br>drop users.preferences and the legacy keys | backend, schema-changing, ui | `G0`, `G1`, `G3` | `14.1`, `14.3`, `17.1 · account`, `17.1 · registry`, `18.3 · slice A`, `20.1 · starter` |
| 189 | `17.1` (leaf, 5 slices)<br>Define scoped preference authority and deterministic precedence | backend, schema-changing, command, ui |  | all its slices: `17.1 · resolver`, `17.1 · account`, `17.1 · registry`, `17.1 · workspace`, `17.1 · retire` |
| 190 | `20.1` (leaf, 2 slices)<br>Replace the unsafe demo with an isolated guided scenario | backend, schema-changing, command, ui |  | all its slices: `20.1 · isolation`, `20.1 · starter` |

## Wave 7

26 nodes.

| # | Node | Kinds | Starts after | Merges after |
|---|---|---|---|---|
| 191 | `08.1 · slice 1`<br>Assignment, commands, hooks, guard, due, blocked and assigned sections | backend, schema-changing, command, ui | `G0`, `G1`, `G2`, `G3` | `01.2`, `03.2 · slots`, `06.2`, `07.1 · setup`, `07.1 · binding`, `07.2 · lineage`, `07.3`, `08.1 · slice 0`, `11.1`, `12.1 · slice A`, `17.1`, `19.2 · slice A` |
| 192 | `08.1` (leaf, 2 slices)<br>Add role-based assignments and executable Today projections | backend, schema-changing, command, ui |  | all its slices: `08.1 · slice 0`, `08.1 · slice 1` |
| 193 | `18.2 · gate 2`<br>projection rebuilds | backend, schema-changing, command | `G0`, `G1`, `G2` | `12.1 · slice B` |
| 194 | `12.2 · inbox`<br>kind registry, consumer, commands, inbox page, bell | backend, schema-changing, command, ui | `G0`, `G1`, `G2`, `G3` | `01.1`, `01.2`, `02.1 · slice C`, `03.1`, `03.2`, `11.1`, `12.1`, `17.1`, `18.1`, `18.2 · gate 2`, `19.2 · slice A`, `21.2`, `21.3`, `22.1` |
| 195 | `12.2 · legacy`<br>dry run, import, activityLog quarantine, read switch | backend, schema-changing, command | `G0`, `G1`, `G2` | `12.2 · inbox` |
| 196 | `12.2 · audit`<br>audit consumer, confidence labels, read matrix, timelines | backend, schema-changing, ui | `G0`, `G1`, `G3` | `01.1`, `01.2`, `02.1 · slice C`, `03.1`, `03.2`, `11.1`, `12.1`, `17.1`, `18.1`, `18.2 · gate 2`, `19.2 · slice A`, `21.2`, `21.3`, `22.1` |
| 197 | `12.2 · retention`<br>purge job, receipts, account and workspace purges | backend, command | `G0`, `G1`, `G2`, `G3` | `01.1`, `01.2`, `02.1 · slice C`, `03.1`, `03.2`, `11.1`, `12.1`, `17.1`, `18.1`, `18.2 · gate 2`, `19.2 · slice A`, `21.2`, `21.3`, `22.1` |
| 198 | `12.2` (leaf, 4 slices)<br>Rebuild notifications and audit as server projections | backend, schema-changing, command, ui |  | all its slices: `12.2 · inbox`, `12.2 · legacy`, `12.2 · audit`, `12.2 · retention` |
| 199 | `12.3 · reports`<br>report registry, version 1 definitions, projections, parity diff | backend, schema-changing, ui | `G0`, `G1`, `G2`, `G3` | `03.1`, `03.2`, `04.1`, `05.2 · slice 1`, `12.1 · slice B`, `12.2 · legacy`, `14.3`, `17.1`, `18.1`, `18.2 · gate 2`, `21.2`, `21.3` |
| 200 | `12.3 · revisions`<br>counted-step-set@1, revision segments, template-runs@2 | backend, ui | `G0`, `G3` | `04.2`, `07.2`, `12.3 · reports` |
| 201 | `12.3` (leaf, 2 slices)<br>Add version-aware reports and deterministic projection rebuilds | backend, schema-changing, ui |  | all its slices: `12.3 · reports`, `12.3 · revisions` |
| 202 | `08.2 · schedules`<br>schedules, occurrences, preview, Repeat, Scheduled list, kill switch | backend, schema-changing, command, ui | `G0`, `G1`, `G2`, `G3` | `01.1`, `01.2`, `02.1 · slice B`, `02.3`, `03.1`, `03.2`, `04.2`, `06.2`, `07.1 · binding`, `07.2`, `08.1 · slice 1`, `09.1 · SetStepState`, `11.1`, `12.1`, `12.2`, `12.3`, `16.1 · envelope`, `17.1`, `18.1`, `19.2 · slice A`, `21.2`, `21.3`, `22.1`, `22.2` |
| 203 | `08.2 · due`<br>due policy writing 08.1 dueAt | backend, command | `G0`, `G1`, `G2` | `01.1`, `01.2`, `02.1 · slice B`, `02.3`, `03.1`, `03.2`, `04.2`, `06.2`, `07.1 · binding`, `07.2`, `08.1 · slice 1`, `09.1 · SetStepState`, `11.1`, `12.1`, `12.2`, `12.3`, `16.1 · envelope`, `17.1`, `18.1`, `19.2 · slice A`, `21.2`, `21.3`, `22.1`, `22.2` |
| 204 | `08.2 · escalation`<br>overdue reminders and escalation | backend, command | `G0`, `G1`, `G2` | `01.1`, `01.2`, `02.1 · slice B`, `02.3`, `03.1`, `03.2`, `04.2`, `06.2`, `07.1 · binding`, `07.2`, `08.1 · slice 1`, `09.1 · SetStepState`, `11.1`, `12.1`, `12.2`, `12.3`, `16.1 · envelope`, `17.1`, `18.1`, `19.2 · slice A`, `21.2`, `21.3`, `22.1`, `22.2` |
| 205 | `08.2` (leaf, 3 slices)<br>Add timezone-safe schedules, recurrence, due policy, and escalation | backend, schema-changing, command, ui |  | all its slices: `08.2 · schedules`, `08.2 · due`, `08.2 · escalation` |
| 206 | `08.3 · conditions`<br>evaluator, publish rules, excluded, records, inputs, migration | backend, schema-changing, command, ui | `G0`, `G1`, `G2`, `G3` | `04.1`, `04.2`, `05.1`, `05.2`, `06.1`, `06.2`, `07.1`, `07.2`, `07.3`, `11.1`, `12.1 · slice A`, `12.3`, `22.1` |
| 207 | `08.3 · exceptions`<br>except, records, authority, progress, decision@1, delete removal | backend, schema-changing, command, ui | `G0`, `G1`, `G2`, `G3` | `01.1`, `01.2`, `03.1`, `03.2`, `05.1`, `05.2`, `05.3`, `09.1 · SetStepState`, `11.1`, `12.1 · slice A`, `12.3` |
| 208 | `08.3` (leaf, 2 slices)<br>Add deterministic conditions and structured exceptions | backend, schema-changing, command, ui |  | all its slices: `08.3 · conditions`, `08.3 · exceptions` |
| 209 | `13.3 · updates`<br>update, defer and quarantine flows | backend, command, ui | `G0`, `G2`, `G3` | `04.2`, `06.3`, `07.3`, `12.2`, `13.3 · install` |
| 210 | `13.2 · listing`<br>listing reads, taxonomy, profiles, tiers, popularity, run counts | backend, schema-changing, ui | `G0`, `G1`, `G3` | `01.2`, `03.1`, `04.1`, `07.2`, `12.1 · slice B`, `13.1`, `13.3 · updates`, `18.1`, `18.2 · gate 2`, `19.2 · slice A`, `21.2`, `21.3` |
| 211 | `13.2 · moderation`<br>reports, moderator grants, queue, pre-listing review | backend, schema-changing, command, ui | `G0`, `G1`, `G2`, `G3` | `02.1 · slice B`, `12.2`, `13.2 · listing` |
| 212 | `13.2 · ratings`<br>ratings, eligibility, aggregate, counter field drop | backend, schema-changing, command, ui | `G0`, `G1`, `G2`, `G3` | `05.2`, `12.3`, `13.2 · moderation` |
| 213 | `13.2` (leaf, 3 slices)<br>Add taxonomy, publisher trust, moderation, reporting, and ratings | backend, schema-changing, command, ui |  | all its slices: `13.2 · listing`, `13.2 · moderation`, `13.2 · ratings` |
| 214 | `18.2` (leaf, 3 slices)<br>Introduce ordered schema migrations and rebuildable projections | backend, schema-changing, command |  | all its slices: `18.2 · gate 1`, `18.2 · gate 1 workspace`, `18.2 · gate 2` |
| 215 | `18.3 · slice B`<br>backup jobs and fenced restore | backend, command | `G0`, `G2` | `01.2 · substrate`, `02.2 · slice B`, `12.1 · slice B`, `18.3 · slice A`, `19.2 · slice A` |
| 216 | `18.3` (leaf, 2 slices)<br>Create encrypted backup manifests, integrity checks, and restore drills | backend, command, ci |  | all its slices: `18.3 · slice A`, `18.3 · slice B` |

## Wave 8

16 nodes.

| # | Node | Kinds | Starts after | Merges after |
|---|---|---|---|---|
| 217 | `02.1 · rule removal`<br>migration dropping the PocketBase sign-in rule<br>_Ships with `19.1 · slice 2` (#32)._ | backend, schema-changing | `G0`, `G1` | `02.1 · slice C` |
| 218 | `02.1` (leaf, 5 slices)<br>Introduce server-mediated session and assurance policies | backend, schema-changing, command, ui |  | all its slices: `02.1 · slice B`, `02.1 · slice C`, `02.1 · slice D`, `02.1 · slice E`, `02.1 · rule removal` |
| 219 | `09.1 · focused view`<br>focused next-step run view | backend, ui | `G0`, `G3` | `02.1`, `03.2`, `05.1`, `05.2`, `07.2`, `08.1`, `08.2`, `08.3`, `09.1 · SetStepState`, `19.2 · slice A`, `21.2`, `21.3`, `22.2 · b1`, `22.2 · b2`, `22.2 · b3` |
| 220 | `09.1` (leaf, 3 slices)<br>Redesign run execution around one focused next step | backend, schema-changing, command, ui |  | all its slices: `09.1 · slice 0`, `09.1 · SetStepState`, `09.1 · focused view` |
| 221 | `09.2 · dispatcher`<br>client envelope, single online write path, states, ordering, drain lock | backend, ui | `G0`, `G1`, `G3` | `02.1`, `05.1`, `07.3`, `09.1 · SetStepState`, `09.1 · focused view`, `11.1`, `19.2 · slice A`, `21.3`, `22.1 · gate B`, `22.2 · b1`, `22.2 · b2`, `22.2 · b3` |
| 222 | `09.2 · outbox`<br>encrypted IndexedDB, offline enqueue, clear policy, ledger columns | backend, schema-changing, ui | `G0`, `G1`, `G3` | `09.2 · dispatcher` |
| 223 | `09.2 · shell`<br>service worker, offline run route, encrypted snapshots | ui | `G3` | `09.2 · outbox` |
| 224 | `09.2` (leaf, 3 slices)<br>Add encrypted local operation queue and explicit sync states | backend, schema-changing, ui |  | all its slices: `09.2 · dispatcher`, `09.2 · outbox`, `09.2 · shell` |
| 225 | `15.1 · slice a`<br>wrapper, reads, pagination, errors, versioning, OpenAPI, reference page | backend, ui | `G0`, `G2`, `G3` | `00.1`, `02.1`, `02.3`, `03.1`, `04.1`, `05.1`, `05.2 · slice 1`, `09.1`, `11.1`, `18.1`, `19.2 · slice A`, `21.2`, `21.3` |
| 226 | `15.1 · slice b`<br>writes, preconditions, idempotency, event catalogue, feed | backend, command | `G0`, `G2` | `04.1`, `07.1`, `09.1`, `12.1 · slice A`, `15.1 · slice a` |
| 227 | `15.1` (leaf, 2 slices)<br>Publish versioned scoped API and pagination contracts | backend, command, ui |  | all its slices: `15.1 · slice a`, `15.1 · slice b` |
| 228 | `15.2 · delivery`<br>webhook collections, commands, delivery job, signing, egress | backend, schema-changing, command | `G0`, `G1`, `G2`, `G3` | `00.4`, `02.1`, `02.2`, `02.3`, `03.1`, `11.1`, `12.1`, `12.2`, `14.1`, `15.1 · slice b`, `18.1`, `19.2 · slice A` |
| 229 | `15.2 · integrations UI`<br>Workspaces → Integrations → Webhooks | ui | `G3` | `15.2 · delivery`, `21.3`, `22.2` |
| 230 | `15.2` (leaf, 2 slices)<br>Add signed webhook subscriptions with retries and delivery receipts | backend, schema-changing, command, ui |  | all its slices: `15.2 · delivery`, `15.2 · integrations UI` |
| 231 | `19.1 · slice 2`<br>internal-only backend and Kubernetes | backend | `G0` | `01.2 · substrate`, `02.1 · slice C`, `19.1 · slice 1` |
| 232 | `19.1` (leaf, 3 slices)<br>Create hardened pinned multi-architecture deployment artifacts | backend, ci |  | all its slices: `19.1 · slice 1`, `19.1 · fonts`, `19.1 · slice 2` |

## Wave 9

29 nodes.

| # | Node | Kinds | Starts after | Merges after |
|---|---|---|---|---|
| 233 | `19.2 · slice D`<br>doctor | backend | `G0` | `12.1`, `15.2`, `18.3 · slice B`, `19.2 · slice B` |
| 234 | `19.2` (leaf, 4 slices)<br>Add one-time bootstrap, config validation, health, and doctor | backend, schema-changing, command, ui |  | all its slices: `19.2 · slice A`, `19.2 · slice B`, `19.2 · slice C`, `19.2 · slice D` |
| 235 | `10.1 · evidence`<br>guards, typed evidence, attachments, legacy labels | backend, schema-changing, command, ui | `G0`, `G1`, `G2`, `G3` | `02.1`, `03.2`, `04.1`, `05.1`, `05.3`, `07.1`, `07.2`, `08.3`, `09.1`, `09.2`, `11.1`, `12.1`, `12.2`, `18.3 · slice B`, `19.2`, `21.3` |
| 236 | `09.3 · sessions`<br>upload sessions, commit, expiry, online upload | backend, schema-changing, command | `G0`, `G1`, `G2`, `10.1 · evidence` | `01.2`, `02.1`, `11.1`, `12.1 · slice B`, `18.2 · gate 1 workspace`, `19.2`, `22.1` |
| 237 | `09.3 · offline capture`<br>encrypted capture, resume, dependsOn | backend, ui | `G0`, `G3` | `05.1`, `09.2 · outbox`, `09.3 · sessions`, `22.2 · b1`, `22.2 · b2`, `22.2 · b3` |
| 238 | `10.1 · comments`<br>comments and mentions | backend, schema-changing, command, ui | `G0`, `G1`, `G2`, `G3` | `10.1 · evidence` |
| 239 | `09.3 · recovery`<br>recovery panel and actions | ui | `G3` | `09.3 · offline capture`, `10.1 · comments`, `21.3` |
| 240 | `09.3` (leaf, 3 slices)<br>Add resumable evidence transfer and conflict recovery | backend, schema-changing, command, ui |  | all its slices: `09.3 · sessions`, `09.3 · offline capture`, `09.3 · recovery` |
| 241 | `10.1` (leaf, 2 slices)<br>Add structured evidence, attachments, comments, and mentions | backend, schema-changing, command, ui |  | all its slices: `10.1 · evidence`, `10.1 · comments` |
| 242 | `10.2 · gate`<br>approval@1, request, decisions, rework, withdraw, separation, panel | backend, schema-changing, command, ui | `G0`, `G1`, `G2`, `G3` | `01.1`, `01.2`, `03.1`, `03.2`, `04.1`, `04.2`, `05.1`, `05.2 · slice 1`, `05.3`, `06.2`, `07.3`, `08.1 · slice 1`, `08.3`, `10.1`, `11.1`, `12.1 · slice A`, `12.2`, `12.3`, `21.3`, `22.1 · gate B` |
| 243 | `10.2 · invalidation`<br>rescind, invalidation hooks | backend, command | `G0`, `G2` | `10.2 · gate` |
| 244 | `10.2 · policy`<br>workspace approval policy and audited disable | backend, schema-changing, command, ui | `G0`, `G1`, `G2`, `G3` | `01.1`, `01.2`, `03.1`, `03.2`, `04.1`, `04.2`, `05.1`, `05.2 · slice 1`, `05.3`, `06.2`, `07.3`, `08.1 · slice 1`, `08.3`, `10.1`, `11.1`, `12.1 · slice A`, `12.2`, `12.3`, `21.3`, `22.1 · gate B` |
| 245 | `10.2 · attention`<br>Today section, notifications, approvals@1 report | backend, ui | `G0`, `G1`, `G3` | `01.1`, `01.2`, `03.1`, `03.2`, `04.1`, `04.2`, `05.1`, `05.2 · slice 1`, `05.3`, `06.2`, `07.3`, `08.1 · slice 1`, `08.3`, `10.1`, `11.1`, `12.1 · slice A`, `12.2`, `12.3`, `21.3`, `22.1 · gate B` |
| 246 | `10.2` (leaf, 4 slices)<br>Add approval policy, decisions, rework, and invalidation | backend, schema-changing, command, ui |  | all its slices: `10.2 · gate`, `10.2 · invalidation`, `10.2 · policy`, `10.2 · attention` |
| 247 | `10.3 · issue`<br>collections, manifest v1, issuance and supersede, verify, member viewer | backend, schema-changing, command, ui | `G0`, `G1`, `G2`, `G3` | `01.1`, `01.2`, `02.2 · slice B`, `04.1`, `05.2 · slice 1`, `07.2`, `09.1 · SetStepState`, `10.1`, `10.2`, `11.1`, `12.1 · slice A`, `16.1 · envelope`, `17.1`, `18.3 · slice B`, `19.2`, `21.2`, `21.3`, `22.1`, `22.2 · b1`, `22.2 · b2`, `22.2 · b3` |
| 248 | `10.3 · share`<br>standard and minimal profiles, 03.3 target, external viewer, print | backend, ui | `G0`, `G3` | `03.3 · primitive`, `10.3 · issue` |
| 249 | `10.3 · revoke`<br>revocation, content purge, 18.3 restore review | backend, command, ui | `G0`, `G2`, `G3` | `10.3 · share` |
| 250 | `10.3` (leaf, 3 slices)<br>Issue immutable portable completion records | backend, schema-changing, command, ui |  | all its slices: `10.3 · issue`, `10.3 · share`, `10.3 · revoke` |
| 251 | `11.2 · slice 1`<br>connection manager, states, status UI, refetch on reconnect | backend, ui | `G0`, `G1`, `G2`, `G3` | `02.1 · slice C`, `04.1`, `09.1`, `09.2`, `11.1`, `19.2`, `21.3`, `22.1 · gate B`, `22.2 · b1`, `22.2 · b2`, `22.2 · b3` |
| 252 | `11.2 · slice 2`<br>positions, catch-up, reset, protocol version, limits | backend, ui | `G0`, `G3` | `03.1`, `03.2`, `03.3`, `04.3`, `07.2`, `11.2 · slice 1`, `12.1 · slice B`, `12.2`, `18.1` |
| 253 | `11.2` (leaf, 2 slices)<br>Add cursor-based realtime reconnect and degraded-state UX | backend, ui |  | all its slices: `11.2 · slice 1`, `11.2 · slice 2` |
| 254 | `11.3 · rebase`<br>server rebase, conflict details, causation checks, retry keys | backend, command | `G0`, `G2` | `01.2`, `04.1`, `04.2`, `09.1`, `11.1`, `12.1 · slice A`, `19.2`, `22.1` |
| 255 | `11.3 · draft`<br>draft conflict row, Keep both, Preserve as new step, draft download | ui | `G3` | `11.2`, `11.3 · rebase`, `21.3`, `22.1 · gate B`, `22.2 · b1`, `22.2 · b2`, `22.2 · b3` |
| 256 | `11.3 · run`<br>Keep mine for step state | backend, ui | `G0`, `G3` | `09.2 · outbox`, `09.3 · recovery`, `10.1`, `10.2`, `11.3 · rebase`, `11.3 · draft` |
| 257 | `11.3` (leaf, 3 slices)<br>Add guided merge and retry for supported conflict classes | backend, command, ui |  | all its slices: `11.3 · rebase`, `11.3 · draft`, `11.3 · run` |
| 258 | `15.3 · participants`<br>participant kinds, authority, deny-list, labels | backend, schema-changing, ui | `G0`, `G1`, `G3` | `01.1`, `01.2`, `02.3`, `03.1`, `03.2`, `09.1`, `10.2`, `11.1`, `12.1`, `12.2`, `15.2`, `18.2`, `19.2`, `21.2`, `21.3`, `22.1`, `22.2` |
| 259 | `15.3 · automations`<br>automation definitions, runs, automation@1, connectors | backend, schema-changing, command, ui | `G0`, `G1`, `G2`, `G3` | `02.1`, `02.2`, `05.1`, `05.3`, `07.1`, `08.1`, `08.2`, `14.1`, `15.1`, `15.3 · participants`, `19.2 · slice D` |
| 260 | `15.3 · agents`<br>agents, services, allowlists | backend, schema-changing, command, ui | `G0`, `G1`, `G2`, `G3` | `08.1 · slice 1`, `15.1`, `15.3 · automations` |
| 261 | `15.3` (leaf, 3 slices)<br>Add durable automations, connector manifests, services, and agent roles | backend, schema-changing, command, ui |  | all its slices: `15.3 · participants`, `15.3 · automations`, `15.3 · agents` |

## Wave 10

21 nodes.

| # | Node | Kinds | Starts after | Merges after |
|---|---|---|---|---|
| 262 | `16.1 · proof`<br>proof and proof-statement content, proof-bundle limits | backend, contract | `G0` | `10.3 · issue` |
| 263 | `16.1` (leaf, 3 slices)<br>Publish canonical versioned package, workflow, and proof schemas | backend, contract |  | all its slices: `16.1 · envelope`, `16.1 · workflow`, `16.1 · proof` |
| 264 | `16.2 · export`<br>ExportTemplateRevision, workflow documents, bundles | backend, command, ui | `G0`, `G2`, `G3` | `01.2`, `02.2 · slice B`, `03.1`, `04.1`, `05.2`, `06.1`, `12.1 · slice A`, `16.1 · workflow`, `16.2 · v1 keys` |
| 265 | `16.2 · import`<br>planImport, ApplyImportPlan, import reports | backend, schema-changing, command, ui | `G0`, `G1`, `G2`, `G3` | `02.1`, `02.2`, `04.2`, `11.1`, `13.1`, `16.2 · export`, `19.2`, `21.3` |
| 266 | `13.3 · offline`<br>install from an imported file | backend, ui | `G0`, `G3` | `13.3 · updates`, `16.2 · import` |
| 267 | `13.3` (leaf, 3 slices)<br>Add dependency-aware install, fork, update, defer, and quarantine flows | backend, schema-changing, command, ui |  | all its slices: `13.3 · install`, `13.3 · updates`, `13.3 · offline` |
| 268 | `16.2 · proof`<br>proof bundle download and offline verify | backend, ui | `G0`, `G3` | `02.2`, `10.1`, `10.3`, `16.1 · proof`, `16.2 · import`, `20.1 · isolation` |
| 269 | `16.2` (leaf, 5 slices)<br>Add deterministic export, dry-run import, and migration reports | backend, schema-changing, command, ui |  | all its slices: `16.2 · v1 repair`, `16.2 · v1 keys`, `16.2 · export`, `16.2 · import`, `16.2 · proof` |
| 270 | `16.3 · view`<br>read-only code view, parser, formatter, offline CLI | backend, ui | `G0`, `G1`, `G2`, `G3` | `02.1`, `03.1`, `04.1`, `04.2`, `05.2`, `06.1`, `06.2`, `08.3`, `11.1`, `12.1`, `16.1`, `16.2 · import`, `21.2`, `21.3`, `22.1 · gate B`, `22.2 · b1`, `22.2 · b2`, `22.2 · b3` |
| 271 | `16.3 · apply`<br>plan and apply from the view or a local file | backend, command, ui | `G0`, `G2`, `G3` | `02.3`, `15.1`, `16.3 · view` |
| 272 | `16.3 · lock`<br>managed-from-file lock<br>_Ships only if the owner approves it (#76)._ | backend, schema-changing, ui | `G0`, `G1`, `G3` | `16.3 · apply` |
| 273 | `16.3` (leaf, 3 slices)<br>Add UI and YAML or JSON blueprints over one schema | backend, schema-changing, command, ui |  | all its slices: `16.3 · view`, `16.3 · apply`, `16.3 · lock` |
| 274 | `20.2 · first run`<br>first-run journey to a completion record | backend, ui | `G0`, `G3` | `01.1`, `02.2 · slice B`, `04.1`, `04.2`, `07.1 · core`, `08.1 · slice 0`, `09.1 · SetStepState`, `10.1 · evidence`, `10.3 · issue`, `12.1 · slice A`, `13.3 · install`, `16.1 · workflow`, `16.2`, `17.1 · registry`, `19.2 · slice D`, `20.2 · workspace`, `22.2 · b1`, `22.2 · b2`, `22.2 · b3` |
| 275 | `20.2` (leaf, 2 slices)<br>Redesign onboarding around first trustworthy execution | backend, command, ui |  | all its slices: `20.2 · workspace`, `20.2 · first run` |
| 276 | `20.3 · loop`<br>loop narrative, Catalog copy, new screenshots | ui | `G3` | `01.1`, `10.3`, `13.2`, `13.3`, `19.1 · slice 1`, `20.1`, `20.2`, `20.3 · honesty`, `21.2`, `22.2 · b1`, `22.2 · b2`, `22.2 · b3` |
| 277 | `20.3` (leaf, 2 slices)<br>Reposition landing and discovery around reusable provable workflows | ui |  | all its slices: `20.3 · honesty`, `20.3 · loop` |
| 278 | `22.3` (leaf)<br>Publish signed multi-architecture images with SBOM and provenance | ci | `G1` | `19.1`, `22.1`, `22.2 · a1`, `22.2 · a2` |
| 279 | `19.3 · procedures`<br>lifecycle chapter, checkmate-upgrade, drills | ci | `G0`, `G1` | `18.3`, `19.1 · slice 1`, `19.2 · slice D`, `19.3 · upgrade note`, `22.3` |
| 280 | `19.3` (leaf, 2 slices)<br>Publish verified upgrade, backup, restore, and rollback procedures | contract, ci |  | all its slices: `19.3 · upgrade note`, `19.3 · procedures` |
| 281 | `22.4 · staged release`<br>staged scenarios, evidence, promotion | ci |  | `12.1 · slice B`, `18.3`, `19.1 · slice 1`, `19.1 · slice 2`, `19.2`, `19.3 · procedures`, `22.2 · b1`, `22.2 · b2`, `22.2 · b3`, `22.3` |
| 282 | `22.4` (leaf, 2 slices)<br>Add staged deployment smoke, rollback evidence, and CI health reporting | ci |  | all its slices: `22.4 · CI health`, `22.4 · staged release` |

## Edge notes

Judgment calls and clarifications recorded on edges, in JSON order.

| From | To | Kind | Source | Note |
|---|---|---|---|---|
| `TRACKER · Pre-0` | `22.1 · gate A` | merge-before-start | #92 | Needs only #1's release policy, `next` and `release` (owner Pre-0 steps). |
| `TRACKER · Pre-0` | `01.3 · graph` | merge-before-start | #31 | Needs only the refined #1. |
| `TRACKER · Pre-0` | `19.1 · fonts` | merge-before-start | #1 Wave plan | No stated prerequisite; #1 plans it in Wave 2. Every PR needs `next` (Pre-0). |
| `00.3 · slice A` | `00.3 · slice B` | merge-before-merge | #1 Wave 0 sequence | 00.3 slice A goes first. |
| `00.3 · slice A` | `18.2 · gate 1` | merge-before-merge | #1 Wave 0 sequence | 00.3 slice A goes first; step 2 is one PR. |
| `07.3 · stub removal` | `09.1 · slice 0` | merge-before-merge | #1 Wave 0 sequence | Stub removal merges first or in the same PR. |
| `00.1` | `22.1 · gate B` | merge-before-start | #92 | The owner's start-after-containment note covers gate B. |
| `00.2` | `22.1 · gate B` | merge-before-start | #92 | The owner's start-after-containment note covers gate B. |
| `00.3` | `22.1 · gate B` | merge-before-start | #92 | The owner's start-after-containment note covers gate B. |
| `00.4` | `22.1 · gate B` | merge-before-start | #92 | The owner's start-after-containment note covers gate B. |
| `09.1 · slice 0` | `19.3 · upgrade note` | merge-before-merge | #85 | The upgrade note merges last in Wave 0. |
| `07.3 · stub removal` | `19.3 · upgrade note` | merge-before-merge | #85 | The upgrade note merges last in Wave 0. |
| `19.3 · upgrade note` | `19.3 · procedures` | merge-before-merge | #85 | The procedures extend the upgrade note's UPGRADING.md. |
| `01.1 · contracts` | `01.1 · adapter` | merge-before-merge | #29 | The adapter maps storage names onto the glossary contracts defines. |
| `01.1 · contracts` | `01.2 · envelope` | merge-before-merge | #30 | #30 orders the leaf after #29; read as `01.1 · contracts`, since `01.1 · adapter` gates only #38 (#1 G2). Envelope has no start prerequisite, so this is merge order only. |
| `01.2 · envelope` | `01.2 · matrix` | merge-before-merge | #30 | Envelope merges first. |
| `01.2 · envelope` | `01.2 · substrate` | merge-before-merge | #30 | Envelope merges first. |
| `19.2 · slice A` | `02.1 · slice B` | merge-before-merge | #32 | Narrowed from #84 to slice A (typed config): `19.2 · slice C` needs this slice, and slice D is Wave 9. |
| `02.1 · slice C` | `02.1 · rule removal` | merge-before-merge | #32 | Drops the sign-in rule after C's cut-over; ships with `19.1 · slice 2`, which waits for C. |
| `02.1 · slice B` | `02.2 · slice A` | merge-before-merge | #33 | Narrowed from #32 (sessions) to slice B: 02.1 slice E is Wave 3 and rule removal Wave 8. |
| `02.2 · slice A` | `02.2 · slice B` | merge-before-merge | #33 | Slice B extends slice A's key registry and `checkmate keys`. |
| `19.2 · slice A` | `02.3 · slice 1` | merge-before-merge | #34 | Narrowed from #84 to slice A (config schema, deployment credential, epoch): `19.2 · slice C` needs this slice. |
| `22.2 · b1` | `02.3 · slice 3` | merge-before-merge | #34 | Narrowed from #93 (harness) to b1: 22.2 part (c) is Wave 4. |
| `02.1 · slice B` | `03.1 · policy` | merge-before-merge | #35 | Narrowed from #32 to slice B (sessions): `02.1 · slice E` needs `03.1 · lifecycle`. |
| `19.2 · slice A` | `03.1 · members` | merge-before-merge | #35 | #84 is for email only (invitations). Narrowed to slice A: `19.2 · slice C` needs 03.1. |
| `02.1 · slice B` | `03.2 · participants` | merge-before-merge | #36 | Narrowed from #32 to slice B (sessions): `02.1 · slice E` needs `03.1 · lifecycle` and gates guests and slots instead. |
| `19.2 · slice A` | `03.2 · participants` | merge-before-merge | #36 | Narrowed from #84 to slice A (typed config): `19.2 · slice D` is Wave 9. |
| `03.2 · participants` | `03.2 · guests` | merge-before-merge | #36 | Guest principals are run Participants. |
| `03.3 · primitive` | `03.2 · guests` | merge-before-merge | #36 | Join links need 03.3's join-run target. |
| `02.1 · slice E` | `03.2 · guests` | merge-before-merge | #36 | Slice E gates any non-owner admission. |
| `03.2 · participants` | `03.2 · slots` | merge-before-merge | #36 | Slot bindings attach to run Participants. |
| `02.1 · slice E` | `03.2 · slots` | merge-before-merge | #36 | Slice E gates any non-owner admission. |
| `02.1 · slice B` | `03.3 · primitive` | merge-before-merge | #37 | Narrowed from #32 to slices B and C (sessions, relay): `02.1 · rule removal` is Wave 8. |
| `02.1 · slice C` | `03.3 · primitive` | merge-before-merge | #37 | Narrowed from #32 to slices B and C (sessions, relay): `02.1 · rule removal` is Wave 8. |
| `19.2 · slice A` | `03.3 · primitive` | merge-before-merge | #37 | Narrowed from #84 to slice A (typed config): `19.2 · slice D` is Wave 9. |
| `03.3 · progress` | `03.3 · template` | merge-before-merge | #37 | `· progress` ships first. |
| `G2` | `04.1 · storage` | merge-before-start | #30 | G2 merges before #38 starts. |
| `02.1 · slice B` | `04.1 · storage` | merge-before-merge | #38 | Narrowed from #32 (resolvePrincipal) to slice B: `02.1 · rule removal` is Wave 8. |
| `16.2 · v1 repair` | `04.1 · storage` | merge-before-merge | #75 | `· v1 repair` lands before #38 migrates templates. |
| `11.1` | `04.1 · commands` | merge-before-merge | #1 Leaf edges beyond the gates | #38 lists #59 for the leaf; #1 places it at `· commands`. |
| `02.1 · slice B` | `04.3 · archive` | merge-before-merge | #40 | Narrowed from #32 (actor) to slice B: `02.1 · rule removal` is Wave 8. |
| `G1` | `05.2 · envelope` | merge-before-start | #42 | Narrowed from #81 to gate 1: `18.2 · gate 2` is Wave 7. |
| `18.3 · slice A` | `05.2 · envelope` | merge-before-merge | #42 | Narrowed from #82 to slice A (snapshot and verify): `18.3 · slice B` is Wave 7. |
| `16.2 · v1 keys` | `05.2 · envelope` | merge-before-merge | #75 | `· v1 keys` lands before #42's export 1.1.0, which `· envelope` ships. |
| `18.3 · slice A` | `05.2 · retire-itemType` | merge-before-merge | #42 | Narrowed from #82 (verified snapshot) to slice A: `18.3 · slice B` is Wave 7. |
| `06.1 · includes` | `06.3 · inspect` | merge-before-merge | #46 | Slice order narrows the leaf's "after #44 and #45": `· inspect` follows `06.1 · includes`, and `· upgrade` takes #45. |
| `G2` | `07.1 · core` | merge-before-start | #30 | G2 merges before #47 starts. |
| `07.2 · contract` | `07.1 · core` | merge-before-merge | #1 Wave plan | #48: slice A lands before #47 core. |
| `07.1 · core` | `07.1 · setup` | merge-before-merge | #47 | Configure run calls core's CreateRun, which replaces the legacy writer. |
| `19.2 · slice A` | `08.1 · slice 1` | merge-before-merge | #50 | Narrowed from #84 to slice A (typed config): `19.2 · slice D` is Wave 9. |
| `19.2 · slice A` | `08.2 · schedules` | merge-before-merge | #51 | Narrowed from #84 to slice A, as #10 rollout step 5 states. |
| `02.1 · slice B` | `08.2 · schedules` | merge-before-merge | #51 | Narrowed from #32 (limiter) to slice B: `02.1 · rule removal` is Wave 8. |
| `19.2 · slice A` | `08.2 · due` | merge-before-merge | #51 | Narrowed from #84 to slice A, as #10 rollout step 5 states. |
| `02.1 · slice B` | `08.2 · due` | merge-before-merge | #51 | Narrowed from #32 (limiter) to slice B: `02.1 · rule removal` is Wave 8. |
| `19.2 · slice A` | `08.2 · escalation` | merge-before-merge | #51 | Narrowed from #84 to slice A, as #10 rollout step 5 states. |
| `02.1 · slice B` | `08.2 · escalation` | merge-before-merge | #51 | Narrowed from #32 (limiter) to slice B: `02.1 · rule removal` is Wave 8. |
| `06.1` | `08.3 · conditions` | merge-before-merge | #52 | Per #10 rollout step 2. |
| `06.2` | `08.3 · conditions` | merge-before-merge | #52 | Per #10 rollout step 2. |
| `07.1` | `08.3 · conditions` | merge-before-merge | #52 | Per #10 rollout step 2. |
| `07.2` | `08.3 · conditions` | merge-before-merge | #52 | Per #10 rollout step 2. |
| `07.3` | `08.3 · conditions` | merge-before-merge | #52 | Per #10 rollout step 2. |
| `04.1` | `08.3 · conditions` | merge-before-merge | #52 | Per #10 rollout step 2. |
| `04.2` | `08.3 · conditions` | merge-before-merge | #52 | Per #10 rollout step 2. |
| `12.3` | `08.3 · conditions` | merge-before-merge | #52 | Per #10 rollout step 2. |
| `09.1 · SetStepState` | `08.3 · exceptions` | merge-before-merge | #52 | Per #10 rollout step 4; it does not wait for `· conditions`. |
| `03.1` | `08.3 · exceptions` | merge-before-merge | #52 | Per #10 rollout step 4; it does not wait for `· conditions`. |
| `05.1` | `08.3 · exceptions` | merge-before-merge | #52 | Per #10 rollout step 4; it does not wait for `· conditions`. |
| `12.3` | `08.3 · exceptions` | merge-before-merge | #52 | Per #10 rollout step 4; it does not wait for `· conditions`. |
| `19.2 · slice A` | `09.1 · focused view` | merge-before-merge | #53 | Narrowed from #84 to slice A (typed config): `19.2 · slice D` is Wave 9. |
| `09.1 · focused view` | `09.2 · dispatcher` | merge-before-merge | #54 | #53 "projection" read as the focused view's execution projection. |
| `07.3` | `09.2 · dispatcher` | merge-before-merge | #54 | #49 for `RUN_UPGRADED`. |
| `19.2 · slice A` | `09.2 · dispatcher` | merge-before-merge | #54 | Narrowed from #84 to slice A (typed config): `19.2 · slice D` is Wave 9. |
| `09.2 · dispatcher` | `09.2 · outbox` | merge-before-merge | #54 | The outbox persists the dispatcher's queue (offline enqueue). |
| `09.2 · outbox` | `09.2 · shell` | merge-before-merge | #54 | Offline progress reads the outbox's queued entries. |
| `10.1 · evidence` | `09.3 · sessions` | merge-before-start | #1 Leaf edges beyond the gates | #56: #55 starts after `· evidence`. |
| `10.2 · gate` | `10.2 · invalidation` | merge-before-merge | #57 | Until `· invalidation`, `· gate` vetoes plans touching a gate. |
| `03.3 · primitive` | `10.3 · share` | merge-before-merge | #58 | #37 and #58: 10.3 registers its target on the 03.3 primitive. |
| `G2` | `11.1 · module` | merge-before-start | #30 | G2 merges before #59 starts. |
| `02.1 · slice B` | `11.1 · module` | merge-before-merge | #59 | Narrowed from #32 (principal) to slice B: `02.1 · rule removal` is Wave 8. |
| `09.2` | `11.2 · slice 1` | merge-before-merge | #60 | #54 lands first and owns held work. Leaf-level #35 to #37, #62 slice B, #63 and #80 apply to `· slice 2`, whose list names them. |
| `11.2` | `11.3 · draft` | merge-before-merge | #61 | #61's "after #57, #55 and #60" applies per slice: `· draft` takes #60, `· run` takes #55 and #57. |
| `11.3 · draft` | `11.3 · run` | merge-before-merge | #61 | Rollout order: rebase, draft, run. |
| `G2` | `12.1 · slice A` | merge-before-start | #30 | G2 merges before #62 starts. |
| `02.1 · slice C` | `12.2 · inbox` | merge-before-merge | #63 | Narrowed from #32 (relay) to slice C: `02.1 · rule removal` is Wave 8. |
| `19.2 · slice A` | `12.2 · inbox` | merge-before-merge | #63 | Narrowed from #84 to slice A (typed config): `19.2 · slice D` is Wave 9. |
| `02.1 · slice C` | `12.2 · audit` | merge-before-merge | #63 | Narrowed from #32 (relay) to slice C: `02.1 · rule removal` is Wave 8. |
| `19.2 · slice A` | `12.2 · audit` | merge-before-merge | #63 | Narrowed from #84 to slice A (typed config): `19.2 · slice D` is Wave 9. |
| `02.1 · slice C` | `12.2 · retention` | merge-before-merge | #63 | Narrowed from #32 (relay) to slice C: `02.1 · rule removal` is Wave 8. |
| `19.2 · slice A` | `12.2 · retention` | merge-before-merge | #63 | Narrowed from #84 to slice A (typed config): `19.2 · slice D` is Wave 9. |
| `12.2 · inbox` | `12.2 · legacy` | merge-before-merge | #63 | Rollout: the projection ships before the legacy import and read switch. |
| `16.2 · v1 repair` | `13.1 · unlisting` | merge-before-merge | #65 | Narrowed from "the #75 starter" to `· v1 repair`, which ships the starter workflow; 16.2's other slices are Wave 10. |
| `18.3 · slice A` | `13.1 · unlisting` | merge-before-merge | #65 | Narrowed from "an #82 snapshot" to slice A: `18.3 · slice B` is Wave 7. |
| `19.2 · slice A` | `13.2 · listing` | merge-before-merge | #66 | Narrowed from #84 to slice A (typed config): `19.2 · slice D` is Wave 9. |
| `02.1 · slice B` | `13.2 · moderation` | merge-before-merge | #66 | Narrowed from #32 (limiter) to slice B: `02.1 · rule removal` is Wave 8. |
| `02.1 · slice B` | `14.1 · slice A` | merge-before-merge | #68 | Narrowed from #32 (principal resolver) to slice B: `02.1 · rule removal` is Wave 8. |
| `14.1 · slice A` | `14.1 · slice B` | merge-before-merge | #68 | Configuration records use slice A's adapter registry. |
| `22.2 · b1` | `14.1 · slice B` | merge-before-merge | #68 | "Later harness": the Integrations panel. |
| `22.2 · b2` | `14.1 · slice B` | merge-before-merge | #68 | "Later harness": the Integrations panel. |
| `22.2 · b3` | `14.1 · slice B` | merge-before-merge | #68 | "Later harness": the Integrations panel. |
| `14.1 · slice B` | `14.1 · slice C` | merge-before-merge | #68 | Slice C replaces the relay start route slice B keeps. |
| `14.1 · slice A` | `14.3 · slice A` | merge-before-merge | #70 | Narrowed from #68 to slices A and C (registry, relay invocations): `14.1 · slice D` ships the next release tag. |
| `14.1 · slice C` | `14.3 · slice A` | merge-before-merge | #70 | Narrowed from #68 to slices A and C (registry, relay invocations): `14.1 · slice D` ships the next release tag. |
| `02.1 · slice B` | `14.3 · slice A` | merge-before-merge | #70 | Narrowed from #32 to slices B and E (rate limiter, DeleteAccount): `02.1 · rule removal` is Wave 8. |
| `02.1 · slice E` | `14.3 · slice A` | merge-before-merge | #70 | Narrowed from #32 to slices B and E (rate limiter, DeleteAccount): `02.1 · rule removal` is Wave 8. |
| `19.2 · slice A` | `14.3 · slice A` | merge-before-merge | #70 | Narrowed from #84 to slice A (typed config): `19.2 · slice D` is Wave 9. |
| `14.2 · research` | `14.2 · step` | merge-before-merge | #69 | `· research` needs only #70, #81 and #62; the leaf's other prerequisites start at `· step`. |
| `19.2 · slice A` | `14.2 · step` | merge-before-merge | #69 | Narrowed from #84 to slice A (typed config): `19.2 · slice D` is Wave 9. |
| `19.2 · slice A` | `15.1 · slice a` | merge-before-merge | #71 | Narrowed from #84 to slice A (typed config): `19.2 · slice D` is Wave 9. |
| `19.2 · slice A` | `15.2 · delivery` | merge-before-merge | #72 | Narrowed from #84 to slice A: `19.2 · slice D` registers this leaf's checks. |
| `15.2` | `15.3 · participants` | merge-before-merge | #73 | #72 merges first. |
| `19.2 · slice A` | `16.1 · envelope` | merge-before-merge | #74 | Narrowed from #84 to slice A (typed config): `19.2 · slice D` is Wave 9. |
| `16.1 · envelope` | `16.1 · workflow` | merge-before-merge | #74 | Workflow and package documents are envelope kinds. |
| `02.3` | `16.3 · apply` | merge-before-merge | #76 | For server apply. |
| `15.1` | `16.3 · apply` | merge-before-merge | #76 | For server apply. |
| `17.2 · schema` | `17.1 · resolver` | merge-before-merge | #78 | #77 cites #78 (AppearanceV1); #78 says `· resolver` needs `· schema`. |
| `17.1 · resolver` | `17.1 · account` | merge-before-merge | #77 | The inspector gains "Clear this device" from `· account`. |
| `02.1 · slice B` | `17.1 · account` | merge-before-merge | #77 | Narrowed from #32 (principal) to slice B: `02.1 · rule removal` is Wave 8. |
| `17.1 · resolver` | `17.1 · workspace` | merge-before-merge | #77 | The workspace layer is a resolver layer. |
| `17.1 · account` | `17.1 · retire` | merge-before-merge | #77 | `· retire` drops keys `· account` moves. |
| `17.1 · registry` | `17.1 · retire` | merge-before-merge | #77 | `· retire` drops keys `· registry` moves. |
| `18.3 · slice A` | `17.1 · retire` | merge-before-merge | #77 | Narrowed from "a verified #82 snapshot" to slice A: `18.3 · slice B` is Wave 7. |
| `17.1 · account` | `17.3 · migrate` | merge-before-merge | #79 | Uses #77's `setDeviceOverrides` from `· account`; both ship in one release. |
| `19.2 · slice A` | `18.1 · slice a` | merge-before-merge | #80 | Narrowed from #84 (CURSOR_KEY) to slice A: `19.2 · slice C` needs 03.1, which needs this leaf. |
| `18.1 · slice a` | `18.1 · slice b` | merge-before-merge | #80 | Slices b and c use slice a's query module. |
| `18.1 · slice a` | `18.1 · slice c` | merge-before-merge | #80 | Slices b and c use slice a's query module. |
| `00.4` | `19.1 · slice 1` | merge-before-merge | #83 | #31 lists this edge under #1's Important delivery refinements. |
| `00.1` | `19.1 · slice 1` | merge-before-merge | #83 | #83 slice 1 keeps every `v0.2.0` file; #31 lists this edge under #1's Important delivery refinements. |
| `00.2` | `19.1 · slice 1` | merge-before-merge | #83 | #83 slice 1 keeps every `v0.2.0` file; #31 lists this edge under #1's Important delivery refinements. |
| `00.3` | `19.1 · slice 1` | merge-before-merge | #83 | #83 slice 1 keeps every `v0.2.0` file; #31 lists this edge under #1's Important delivery refinements. |
| `19.2 · slice A` | `19.1 · slice 1` | merge-before-merge | #83 | #31 lists this edge under #1's Important delivery refinements. |
| `19.2 · slice B` | `19.1 · slice 1` | merge-before-merge | #1 Leaf edges beyond the gates | #31 lists this edge under #1's Important delivery refinements. |
| `19.1 · slice 1` | `19.1 · slice 2` | merge-before-merge | #83 | Slice 2 removes the backend host port slice 1 publishes. |
| `02.1 · slice C` | `19.1 · slice 2` | merge-before-merge | #1 Leaf edges beyond the gates | #31 lists this edge under #1's Important delivery refinements. |
| `02.1 · slice B` | `19.2 · slice C` | merge-before-merge | #84 | Narrowed from #32 (limiter) to slice B: `02.1 · rule removal` is Wave 8. |
| `02.1 · slice B` | `20.1 · isolation` | merge-before-merge | #86 | Narrowed from #32 (sessions) to slice B: `02.1 · rule removal` is Wave 8. |
| `02.1 · slice E` | `20.1 · isolation` | merge-before-merge | #86 | Reverse edge: #32's zero-grace account purge lands before `· isolation`. |
| `20.1 · isolation` | `20.1 · starter` | merge-before-merge | #86 | `· starter` installs into `· isolation`'s tenants. |
| `16.2 · v1 repair` | `20.1 · starter` | merge-before-merge | #86 | Narrowed from "the #75 starter document" to `· v1 repair`, which ships it; 16.2's other slices are Wave 10. |
| `G3` | `21.2 · names` | merge-before-start | #90 | #90's leaf-level #91 applies to `· tracker` and `· editor`; `· names` runs beside 21.3 (#89). |
| `19.2 · slice A` | `22.2 · c2` | merge-before-merge | #93 | Narrowed from #84 (bootstrap config) to slices A and B: `19.2 · slice D` is Wave 9. |
| `19.2 · slice B` | `22.2 · c2` | merge-before-merge | #93 | Narrowed from #84 (bootstrap config) to slices A and B: `19.2 · slice D` is Wave 9. |

## Filed capability edges

Each filed epic dependency is realized by a leaf-level path, or dropped with a reason. Capability edges are never expanded into leaf edges.

| Capability edge | Filed in | Realized by |
|---|---|---|
| CHECKMATE-00 → CHECKMATE-01 | filed #3 Dependencies | `00.1` → `01.2 · matrix` |
| CHECKMATE-00 → CHECKMATE-02 | filed #4 Dependencies | `00.1` → `02.1 · slice B` |
| CHECKMATE-01 → CHECKMATE-02 | filed #4 Dependencies | `01.1` → `02.1 · slice B` |
| CHECKMATE-00 → CHECKMATE-03 | filed #5 Dependencies | `00.1` → `03.1 · policy` |
| CHECKMATE-01 → CHECKMATE-03 | filed #5 Dependencies | `01.1` → `03.1 · policy` |
| CHECKMATE-02 → CHECKMATE-03 | filed #5 Dependencies | `02.1 · slice B` → `03.1 · policy` |
| CHECKMATE-01 → CHECKMATE-04 | filed #6 Dependencies | `01.1` → `04.2 · core` |
| CHECKMATE-02 → CHECKMATE-04 | filed #6 Dependencies | `02.1 · slice B` → `04.1 · storage` |
| CHECKMATE-01 → CHECKMATE-05 | filed #7 Dependencies | `01.1` → `05.1 · contract` |
| CHECKMATE-04 → CHECKMATE-05 | filed #7 Dependencies | `04.1 · commands` → `05.1 · enforcement` |
| CHECKMATE-04 → CHECKMATE-06 | filed #8 Dependencies | `04.1` → `06.1 · includes` |
| CHECKMATE-05 → CHECKMATE-06 | filed #8 Dependencies | `05.1` → `06.1 · includes` |
| CHECKMATE-04 → CHECKMATE-07 | filed #9 Dependencies | `04.1` → `07.1 · core` |
| CHECKMATE-05 → CHECKMATE-07 | filed #9 Dependencies | `05.1` → `07.3 · plan` |
| CHECKMATE-06 → CHECKMATE-07 | filed #9 Dependencies | `06.1` → `07.3 · plan` |
| CHECKMATE-03 → CHECKMATE-08 | filed #10 Dependencies | `03.1` → `08.2 · schedules` |
| CHECKMATE-05 → CHECKMATE-08 | filed #10 Dependencies | `05.1` → `08.3 · conditions` |
| CHECKMATE-07 → CHECKMATE-08 | filed #10 Dependencies | `07.1` → `08.3 · conditions` |
| CHECKMATE-07 → CHECKMATE-09 | filed #11 Dependencies | `07.1 · core` → `09.1 · SetStepState` |
| CHECKMATE-08 → CHECKMATE-09 | filed #11 Dependencies | `08.1` → `09.1 · focused view` |
| CHECKMATE-03 → CHECKMATE-10 | filed #12 Dependencies | `03.1` → `10.2 · gate` |
| CHECKMATE-07 → CHECKMATE-10 | filed #12 Dependencies | `07.1` → `10.1 · evidence` |
| CHECKMATE-09 → CHECKMATE-10 | filed #12 Dependencies | `09.1` → `10.1 · evidence` |
| CHECKMATE-04 → CHECKMATE-11 | filed #13 Dependencies | `04.1` → `11.2 · slice 1` |
| CHECKMATE-07 → CHECKMATE-11 | filed #13 Dependencies | `07.2` → `11.2 · slice 2` |
| CHECKMATE-09 → CHECKMATE-11 | filed #13 Dependencies | `09.1` → `11.2 · slice 1` |
| CHECKMATE-01 → CHECKMATE-12 | filed #14 Dependencies | `01.1` → `12.2 · inbox` |
| CHECKMATE-02 → CHECKMATE-12 | filed #14 Dependencies | `02.1 · slice C` → `12.2 · inbox` |
| CHECKMATE-07 → CHECKMATE-12 | filed #14 Dependencies | `07.2` → `12.3 · revisions` |
| CHECKMATE-00 → CHECKMATE-13 | filed #15 Dependencies | `00.1` → `13.1 · contracts` |
| CHECKMATE-03 → CHECKMATE-13 | filed #15 Dependencies | `03.1` → `13.1 · contracts` |
| CHECKMATE-04 → CHECKMATE-13 | filed #15 Dependencies | `04.1` → `13.1 · contracts` |
| CHECKMATE-06 → CHECKMATE-13 | filed #15 Dependencies | `06.1` → `13.1 · contracts` |
| CHECKMATE-00 → CHECKMATE-14 | filed #16 Dependencies | `00.1` → `14.1 · slice A` |
| CHECKMATE-02 → CHECKMATE-14 | filed #16 Dependencies | `02.1 · slice B` → `14.1 · slice A` |
| CHECKMATE-04 → CHECKMATE-14 | filed #16 Dependencies | `04.1` → `14.3 · slice A` |
| CHECKMATE-05 → CHECKMATE-14 | filed #16 Dependencies | `05.1` → `14.2 · step` |
| CHECKMATE-02 → CHECKMATE-15 | filed #17 Dependencies | `02.1` → `15.1 · slice a` |
| CHECKMATE-05 → CHECKMATE-15 | filed #17 Dependencies | `05.1` → `15.1 · slice a` |
| CHECKMATE-12 → CHECKMATE-15 | filed #17 Dependencies | `12.1` → `15.2 · delivery` |
| CHECKMATE-01 → CHECKMATE-16 | filed #18 Dependencies | `01.1` → `16.1 · envelope` |
| CHECKMATE-04 → CHECKMATE-16 | filed #18 Dependencies | `04.1` → `16.1 · envelope` |
| CHECKMATE-05 → CHECKMATE-16 | filed #18 Dependencies | `05.1` → `16.1 · envelope` |
| CHECKMATE-10 → CHECKMATE-16 | filed #18 Dependencies | `10.1` → `16.2 · proof` |
| CHECKMATE-01 → CHECKMATE-17 | filed #19 Dependencies | `01.1` → `17.1 · account` |
| CHECKMATE-02 → CHECKMATE-17 | filed #19 Dependencies | `02.1 · slice B` → `17.1 · account` |
| CHECKMATE-00 → CHECKMATE-18 | filed #20 Dependencies | `00.1` → `18.2 · gate 1 workspace` |
| CHECKMATE-01 → CHECKMATE-18 | filed #20 Dependencies | `01.2` → `18.1 · slice a` |
| CHECKMATE-12 → CHECKMATE-18 | filed #20 Dependencies | `12.1 · slice B` → `18.2 · gate 2` |
| CHECKMATE-00 → CHECKMATE-19 | filed #21 Dependencies | `00.1` → `19.1 · slice 1` |
| CHECKMATE-02 → CHECKMATE-19 | filed #21 Dependencies | `02.1 · slice B` → `19.2 · slice C` |
| CHECKMATE-18 → CHECKMATE-19 | filed #21 Dependencies | `18.3` → `19.3 · procedures` |
| CHECKMATE-00 → CHECKMATE-20 | filed #22 Dependencies | `00.1` → `20.1 · isolation` |
| CHECKMATE-04 → CHECKMATE-20 | filed #22 Dependencies | `04.1` → `20.2 · first run` |
| CHECKMATE-07 → CHECKMATE-20 | filed #22 Dependencies | `07.1 · core` → `20.1 · isolation` |
| CHECKMATE-01 → CHECKMATE-21 | filed #23 Dependencies | `01.1` → `21.1 · shell` |
| CHECKMATE-00 → CHECKMATE-22 | filed #24 Dependencies | `00.1` → `22.1 · gate B` |
| CHECKMATE-18 → CHECKMATE-22 | filed #24 Dependencies | `18.2 · gate 1` → `22.2 · c1` |
| CHECKMATE-19 → CHECKMATE-22 | filed #24 Dependencies | `19.1` → `22.3` |
| CHECKMATE-21 → CHECKMATE-22 | filed #24 Dependencies | `21.1 · tokens` → `22.2 · b1` |

## Open owner decisions

None. Every edge is approved; an owner decision would add a `pending-owner` edge with its fallback here.
