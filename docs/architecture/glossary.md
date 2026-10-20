# Glossary

<!-- Generated from src/lib/domain/ by `npx tsx scripts/transformation/render.ts`. Do not edit; src/lib/domain/vocabulary.test.ts fails when this file is stale. -->

Domain contract `1.0.0`, from [CHECKMATE-01.1](https://github.com/keyurgolani/Checkmate/issues/29). The files in [`src/lib/domain/`](../../src/lib/domain/) are the source, and this page is their readable form. A leaf cites the contract version it builds on.

Each term has one label (what people see), one domain name (code, commands and APIs), one storage name and one owning leaf. A storage name is what PocketBase holds today, or what a leaf will add. Legacy storage names stay behind one adapter until a migration renames them.

Every link in the governing loop has an entry here: `Template → immutable revision → configured run → execution evidence → approvals → portable completion record`.

## Entities

| Term | Label | Domain name | Storage | Owner | Meaning |
|---|---|---|---|---|---|
| Account | Account | `Account` | `users` | [02.1](https://github.com/keyurgolani/Checkmate/issues/32) | A person's identity, sessions, security settings and personal preferences. |
| Secret Reference | Credential | `SecretReference` | `secret_references` (planned, [00.2](https://github.com/keyurgolani/Checkmate/issues/26)) | [02.2](https://github.com/keyurgolani/Checkmate/issues/33) | Points to an encrypted provider or integration credential. The secret never sits in a profile or preference record. |
| Workspace | Workspace | `Workspace` | `workspaces` | [03.1](https://github.com/keyurgolani/Checkmate/issues/35) | Owns members, roles, policies, templates, runs and catalog installations. |
| Template | Template | `Template` | `blueprints` | [04.1](https://github.com/keyurgolani/Checkmate/issues/38) | The reusable workflow definition that a draft and its revisions belong to. |
| Template Draft | Draft | `TemplateDraft` | `blueprints`. Draft fields on the template row, steps in `items`. | [04.1](https://github.com/keyurgolani/Checkmate/issues/38) | The editable copy of a template that its collaborators work on: its title, description, questions, resources and steps. |
| Template Revision | Revision | `TemplateRevision` | `templateRevisions` (planned) | [04.1](https://github.com/keyurgolani/Checkmate/issues/38) | An immutable, numbered release of a draft. It can be addressed, diffed and rolled back to. |
| Step Definition | Step | `StepDefinition` | `items`. Draft steps. A revision keeps its steps in its own document. | [05.1](https://github.com/keyurgolani/Checkmate/issues/41) | One schema-validated step in a draft or revision, such as an action, instruction, field, decision, evidence request, approval, automation, section or module include. |
| Module Include | Module include | `ModuleInclude` | `moduleLocks` (planned). The include is a `module-include@1` step; the lock pins its revision. | [06.1](https://github.com/keyurgolani/Checkmate/issues/44) | Includes one published revision of another template, with parameters and role slots, and keeps that revision's provenance. |
| Run | Run | `Run` | `instances` | [07.1](https://github.com/keyurgolani/Checkmate/issues/47) | One execution of one template revision, with its inputs, role bindings, schedule and status. |
| Run Step | Step | `RunStep` | `instanceItems` | [07.1](https://github.com/keyurgolani/Checkmate/issues/47) | One step of a run. It keeps the source revision and Step Key of the step it came from. |
| Participant | Participant | `Participant` | `runParticipants` (planned) | [03.2](https://github.com/keyurgolani/Checkmate/issues/36) | A person, guest, service, automation or agent admitted to a run with a role. |
| Assignment | Assignment | `Assignment` | `assignments` (planned) | [08.1](https://github.com/keyurgolani/Checkmate/issues/50) | Names who should do one run step: a participant or a role slot. |
| Evidence | Evidence | `Evidence` | `evidence` (planned) | [10.1](https://github.com/keyurgolani/Checkmate/issues/56) | A value or file submitted for a run step, kept as its own record. |
| Comment | Comment | `Comment` | `comments` (planned) | [10.1](https://github.com/keyurgolani/Checkmate/issues/56) | A note on a run step. Each edit adds a comment revision. |
| Approval Decision | Approval decision | `ApprovalDecision` | `approvalDecisions` (planned) | [10.2](https://github.com/keyurgolani/Checkmate/issues/57) | An approver's approve, reject or rescind on an approval step, bound to the evidence on record. |
| Exception | Exception | `Exception` | `stepExceptions` (planned) | [08.3](https://github.com/keyurgolani/Checkmate/issues/52) | The recorded reason a run step was skipped, not applicable or done differently. An excepted step counts as done. |
| Event | Event | `Event` | `events` (planned) | [12.1](https://github.com/keyurgolani/Checkmate/issues/62) | An immutable record of one accepted change, with its actor, time, cause and what changed. |
| Audit Entry | Audit entry | `AuditEntry` | `auditEntries` (planned) | [12.2](https://github.com/keyurgolani/Checkmate/issues/63) | A workspace's audit record of one event, kept for the workspace's retention period. |
| Share Capability | Share link | `ShareCapability` | `shareCapabilities` (planned) | [03.3](https://github.com/keyurgolani/Checkmate/issues/37) | A revocable, expiring link that grants one declared view and its actions on a template, run, progress view or completion record. |
| Catalog Package | Package | `CatalogPackage` | `packageVersions` (planned) | [13.1](https://github.com/keyurgolani/Checkmate/issues/65) | Signed, versioned template revisions with their dependencies, permissions, compatibility and provenance. |
| Schedule | Schedule | `Schedule` | `schedules` (planned) | [08.2](https://github.com/keyurgolani/Checkmate/issues/51) | Creates runs at set times, one per occurrence, however often delivery retries. |
| Automation Definition | Automation | `AutomationDefinition` | `automations` (planned) | [15.3](https://github.com/keyurgolani/Checkmate/issues/73) | A saved automation that acts only through declared commands, with durable delivery that never repeats an effect. |
| Completion Record | Completion record | `CompletionRecord` | `completionRecords` (planned) | [10.3](https://github.com/keyurgolani/Checkmate/issues/58) | Immutable, portable proof of a completed run: its revision, inputs, decisions, evidence, actors and events. |

## Supporting terms

| Term | Label | Domain name | Storage | Owner | Meaning |
|---|---|---|---|---|---|
| Membership | Member | `Membership` | `memberships` (planned) | [03.1](https://github.com/keyurgolani/Checkmate/issues/35) | A principal's role in a workspace. |
| Grant | Shared access | `Grant` | `collaborators`, moving to `memberships` in [03.1](https://github.com/keyurgolani/Checkmate/issues/35) | [03.1](https://github.com/keyurgolani/Checkmate/issues/35) | A person's role on one template, without a workspace membership. |
| Invitation | Invitation | `Invitation` | `collaborators.acceptedAt`, moving to `invitations` in [03.1](https://github.com/keyurgolani/Checkmate/issues/35). Pending while `acceptedAt` is empty. | [03.1](https://github.com/keyurgolani/Checkmate/issues/35) | An offer of a membership or grant that the invitee accepts, declines or lets expire. |
| Guest | Guest | `Guest` | `runParticipants.principalKind = guest` (planned) | [03.2](https://github.com/keyurgolani/Checkmate/issues/36) | A run participant without an account, limited to that run. |
| Parameter | Input | `Parameter` | `blueprints.questions`, moving to `blueprints.parameters` in [06.2](https://github.com/keyurgolani/Checkmate/issues/45) | [06.2](https://github.com/keyurgolani/Checkmate/issues/45) | A typed input a run supplies when it starts. |
| Role Slot | Role | `RoleSlot` | `blueprints.roleSlots` (planned) | [06.2](https://github.com/keyurgolani/Checkmate/issues/45) | A named role in a template that performs or approves steps. A run binds people to it. |
| Condition | Condition | `Condition` | `items.metadata.conditions` | [08.3](https://github.com/keyurgolani/Checkmate/issues/52) | An expression over a run's inputs that decides whether a step is in the run. |
| Module | Module | `Module` | `blueprints` | [06.1](https://github.com/keyurgolani/Checkmate/issues/44) | A template whose published revisions other templates can include. |
| Installation | Installation | `Installation` | `installations` (planned, [13.1](https://github.com/keyurgolani/Checkmate/issues/65)) | [13.3](https://github.com/keyurgolani/Checkmate/issues/67) | A workspace's use of one package version. It grants read and run on the version's locked revisions and copies nothing. |
| Fork | Fork | `Fork` | `blueprints.forkedFrom` (planned) | [13.3](https://github.com/keyurgolani/Checkmate/issues/67) | A new template made from an installed package version. It keeps the Step Keys and records its source. |
| Quarantine | Quarantine | `Quarantine` | `catalogListings.quarantined` (planned, [13.1](https://github.com/keyurgolani/Checkmate/issues/65)) | [13.3](https://github.com/keyurgolani/Checkmate/issues/67) | A hold on a package version that blocks new installs and runs. Runs already started continue. |
| Progress View | Progress view | `ProgressView` | Not stored. A projection, `run-progress@1`. | [03.3](https://github.com/keyurgolani/Checkmate/issues/37) | A read-only view of one run's progress that a share link can show. |
| Report | Report | `Report` | Not stored. Event-derived projections, one per definition version. | [12.3](https://github.com/keyurgolani/Checkmate/issues/64) | A versioned definition of figures computed from events. |
| Notification | Notification | `Notification` | `notifications`, moving to `inboxItems` in [12.2](https://github.com/keyurgolani/Checkmate/issues/63) | [12.2](https://github.com/keyurgolani/Checkmate/issues/63) | A message to one recipient about an event. |
| Account Preferences | Preferences | `AccountPreferences` | `users.preferences`, moving to `accountPreferences` in [17.1](https://github.com/keyurgolani/Checkmate/issues/77) | [17.1](https://github.com/keyurgolani/Checkmate/issues/77) | An account's presentation and notification settings. It never holds a secret. |
| Principal | Not shown. Screens show the actor's name. | `Principal` | Not stored. Resolved per request. Records keep it as `actorKind` and `actorId`. | [01.2](https://github.com/keyurgolani/Checkmate/issues/30) | Who a request acts as, such as an account, a guest, a link holder, a service, an automation, an agent or the system. |
| Step Key | Step key | `stepKey` | `items.stepKey` (planned, [04.1](https://github.com/keyurgolani/Checkmate/issues/38)). Run steps keep it in `instanceItems.stepKey` (07.2). | [01.1](https://github.com/keyurgolani/Checkmate/issues/29) | A step's stable, opaque identity across edits, revisions, copies, forks, exports and runs. |
| Lineage | Not shown. Used only to match steps. | `Lineage` | Not stored. Follows revisions, copies and forks. | [01.1](https://github.com/keyurgolani/Checkmate/issues/29) | A template's revisions plus the copies and forks made from them. Step Keys match only within one lineage. |
| Aggregate revision | Not shown. Sent as an ETag. | `aggregateRevision` | `aggregateRevision` (planned, [11.1](https://github.com/keyurgolani/Checkmate/issues/59)). On `blueprints` (Template Draft) and `instances` (Run). | [01.1](https://github.com/keyurgolani/Checkmate/issues/29) | Counts accepted commands on one aggregate. It is never the revision number. |
| Step revision | Not shown. Sent as an ETag. | `stepRevision` | `stepRevision` (planned, [11.1](https://github.com/keyurgolani/Checkmate/issues/59)). On `items` and `instanceItems`. | [01.1](https://github.com/keyurgolani/Checkmate/issues/29) | Counts accepted commands on one step, so edits to different steps don't conflict. |
| Update Notice | Update available | `UpdateNotice` | `updateNotices` (planned, [06.3](https://github.com/keyurgolani/Checkmate/issues/46)) | [01.1](https://github.com/keyurgolani/Checkmate/issues/29) | Says a newer revision exists for an installation, include lock or run, from one revision to another. |
| Deferral | Deferral | `Deferral` | `upgradeDeferrals` (planned, [06.3](https://github.com/keyurgolani/Checkmate/issues/46)) | [01.1](https://github.com/keyurgolani/Checkmate/issues/29) | Postpones one update notice, with an actor, a reason and an expiry. When it expires the notice is open again. |
| Projection | Not shown. Screens show its content. | `Projection` | Not stored. A read model, by default a bounded indexed query (18.1). | [01.1](https://github.com/keyurgolani/Checkmate/issues/29) | An authorized server read model. Only audit, reports and catalog aggregates are built from events. |

## Step kinds

Kind keys are permanent once 04.1 writes revisions.

| Kind | Owner | Meaning |
|---|---|---|
| `task@1` | [05.2](https://github.com/keyurgolani/Checkmate/issues/42) | An action someone does and checks off. Shown as Action. |
| `instruction@1` | [05.2](https://github.com/keyurgolani/Checkmate/issues/42) | Text to read. Nothing to check off. |
| `section@1` | [05.2](https://github.com/keyurgolani/Checkmate/issues/42) | Groups steps. Replaces phases. |
| `legacy-reference@1` | [05.2](https://github.com/keyurgolani/Checkmate/issues/42) | A baseline reference to another template. Run creation resolves it to the target's current published revision. |
| `module-include@1` | [06.1](https://github.com/keyurgolani/Checkmate/issues/44) | Includes one locked revision of a module. |
| `decision@1` | [08.3](https://github.com/keyurgolani/Checkmate/issues/52) | Pick one of a set of options. |
| `field@1` | [10.1](https://github.com/keyurgolani/Checkmate/issues/56) | Record a value. |
| `evidence-request@1` | [10.1](https://github.com/keyurgolani/Checkmate/issues/56) | Ask for evidence, such as a photo or a file. |
| `approval@1` | [10.2](https://github.com/keyurgolani/Checkmate/issues/57) | Approve the steps it names before the run can complete. |
| `automation@1` | [15.3](https://github.com/keyurgolani/Checkmate/issues/73) | A step an automation performs. |

## Retired words

These are no longer entity, alias or UI words. Storage names stay behind the adapter until a migration renames them.

| Word | Use | Note |
|---|---|---|
| Blueprint | Template | Survives only as the name of the YAML or JSON file form (16.3). |
| Checklist | Run | Run is the domain, API and navigation term. Plain-language copy may still say checklist. |
| Instance | Run | Storage keeps `instances` and `instance` for now. |
| ChecklistItem | Run Step | Code name today. |
| InstanceItem | Run Step | Storage keeps `instanceItems` for now. |
| Task | Step | The kind key `task@1` stays and is shown as Action. |
| Item | Step | Storage keeps `items` for now. |
| Module Package | Module or Catalog Package | A module is a template; a package is what the catalog signs and versions. |
| Phase | Section | Storage keeps the `phase` item type until 05.2 retires the column. |

## Capability

"Capability" always takes a qualifier.

| Term | Owner | Meaning |
|---|---|---|
| Share Capability | [03.3](https://github.com/keyurgolani/Checkmate/issues/37) | What a share link lets its holder see and do. |
| Step capability | [05.1](https://github.com/keyurgolani/Checkmate/issues/41) | A registered step kind and version, such as `task@1`. |
| Provider capability | [14.1](https://github.com/keyurgolani/Checkmate/issues/68) | What an AI or integration provider supports, found by negotiation. |
| Package requirement capability | [13.1](https://github.com/keyurgolani/Checkmate/issues/65) | A step kind a package needs, listed in its `requires`. |

## Navigation

Seven destinations, in this order. [21.1](https://github.com/keyurgolani/Checkmate/issues/89) builds the nav registry from these IDs, labels and order.

| ID | Label | Route | Holds |
|---|---|---|---|
| `today` | Today | `/today` | Work that needs you now: assigned, due, blocked, awaiting approval and recently resumed. |
| `library` | Library | `/library` | Templates you own, shared with you, installed or public. |
| `runs` | Runs | `/runs` | Active, scheduled, completed, blocked and offline runs. |
| `workspaces` | Workspaces | `/workspaces` | People, roles, policy, integrations and workspace activity. |
| `catalog` | Catalog | `/catalog` | Discovery, trust, dependencies, installation and updates. |
| `activity` | Activity | `/activity` | Event history, notifications, reports and completion records. |
| `settings` | Settings | `/settings` | Profile, appearance, integrations, security and deployment. |

Each move is a permanent 308 redirect for the path and every path under it, print routes included.

| From | To | Added by |
|---|---|---|
| `/dashboard` | `/today` | [08.1](https://github.com/keyurgolani/Checkmate/issues/50) |
| `/templates` | `/library` | [21.2](https://github.com/keyurgolani/Checkmate/issues/90) |
| `/checklists` | `/runs` | [21.2](https://github.com/keyurgolani/Checkmate/issues/90) |
| `/discover` | `/catalog` | [21.2](https://github.com/keyurgolani/Checkmate/issues/90) |
| `/reports` | `/activity/reports` | [21.2](https://github.com/keyurgolani/Checkmate/issues/90) |
| `/profile` | `/settings/profile` | [21.2](https://github.com/keyurgolani/Checkmate/issues/90) |

Action labels. N is the revision number.

| Label | Command | Owner |
|---|---|---|
| Release revision N | `PublishRevision` | [04.1](https://github.com/keyurgolani/Checkmate/issues/38) |
| Start run | `CreateRun` | [07.1](https://github.com/keyurgolani/Checkmate/issues/47) |
| Release revision N and start | `StartRunFromDraft` | [07.1](https://github.com/keyurgolani/Checkmate/issues/47) |
| Publish to catalog | `PublishToCatalog` | [13.1](https://github.com/keyurgolani/Checkmate/issues/65) |

## Commands

Every command a lifecycle names, with the leaf that builds it. [01.2](https://github.com/keyurgolani/Checkmate/issues/30)'s matrix rows use these names.

| Command | Owner | Note |
|---|---|---|
| `DeleteAccount` | [02.1](https://github.com/keyurgolani/Checkmate/issues/32) | Soft delete. The account purge follows the grace period. |
| `DeleteWorkspace` | [03.1](https://github.com/keyurgolani/Checkmate/issues/35) | Soft delete. The workspace purge follows the grace period. |
| `TransferOwnership` | [03.1](https://github.com/keyurgolani/Checkmate/issues/35) |  |
| `CreateShareCapability` | [03.3](https://github.com/keyurgolani/Checkmate/issues/37) |  |
| `RevokeShareCapability` | [03.3](https://github.com/keyurgolani/Checkmate/issues/37) |  |
| `RevokeAllShareCapabilities` | [03.3](https://github.com/keyurgolani/Checkmate/issues/37) | For a workspace, or the whole deployment. |
| `CreateTemplateDraft` | [04.1](https://github.com/keyurgolani/Checkmate/issues/38) | Create, copy, duplicate, import and fork. |
| `DraftCommand` | [04.1](https://github.com/keyurgolani/Checkmate/issues/38) | Any of 04.1's draft ops: AddStep, UpdateStep, MoveStep, RemoveStep, SetQuestion, SetInclude, SetLock, SetHeaderField. |
| `PublishRevision` | [04.1](https://github.com/keyurgolani/Checkmate/issues/38) | Shown as "Release revision N". |
| `DeprecateRevision` | [04.3](https://github.com/keyurgolani/Checkmate/issues/40) |  |
| `UndeprecateRevision` | [04.3](https://github.com/keyurgolani/Checkmate/issues/40) |  |
| `ArchiveTemplate` | [04.3](https://github.com/keyurgolani/Checkmate/issues/40) | Soft delete. The template is purged with its workspace. |
| `CreateRun` | [07.1](https://github.com/keyurgolani/Checkmate/issues/47) |  |
| `StartRunFromDraft` | [07.1](https://github.com/keyurgolani/Checkmate/issues/47) | Releases revision N and starts a run in one attributed command. |
| `DeleteRun` | [07.2](https://github.com/keyurgolani/Checkmate/issues/48) |  |
| `PlanRunUpgrade` | [07.3](https://github.com/keyurgolani/Checkmate/issues/49) |  |
| `ApplyRunUpgrade` | [07.3](https://github.com/keyurgolani/Checkmate/issues/49) |  |
| `DeferRunUpgrade` | [07.3](https://github.com/keyurgolani/Checkmate/issues/49) |  |
| `SetStepState` | [09.1](https://github.com/keyurgolani/Checkmate/issues/53) | Takes the desired state. |
| `CompleteRun` | [09.1](https://github.com/keyurgolani/Checkmate/issues/53) |  |
| `ReopenRun` | [09.1](https://github.com/keyurgolani/Checkmate/issues/53) | Needs an actor and a reason. |
| `CancelRun` | [09.1](https://github.com/keyurgolani/Checkmate/issues/53) |  |
| `DecideApproval` | [10.2](https://github.com/keyurgolani/Checkmate/issues/57) | Approve, reject or rescind. |
| `PublishToCatalog` | [13.1](https://github.com/keyurgolani/Checkmate/issues/65) | Shown as "Publish to catalog". |

## Lifecycles

Each transition names its command, or Time or Derived as its cause. An owner adds states and transitions with a minor bump, and removes or renames one only through a superseding decision record and a major bump.

### Template Draft (`blueprints.draftState`)

Owner [04.1](https://github.com/keyurgolani/Checkmate/issues/38). States: `new`, `dirty` and `clean`. A record starts as `new` by `CreateTemplateDraft`. No state is terminal.

| From | To | Cause |
|---|---|---|
| `new` | `dirty` | `DraftCommand` |
| `clean` | `dirty` | `DraftCommand` |
| `new` | `clean` | `PublishRevision`; `StartRunFromDraft` |
| `dirty` | `clean` | `PublishRevision`; `StartRunFromDraft` |

### Template Revision (`templateLifecycleDecisions`)

Owner [04.3](https://github.com/keyurgolani/Checkmate/issues/40). A revision's state is its latest deprecate or undeprecate decision. Revision rows never change. States: `published` and `deprecated`. A record starts as `published` by `PublishRevision` or `StartRunFromDraft`. No state is terminal.

| From | To | Cause |
|---|---|---|
| `published` | `deprecated` | `DeprecateRevision` |
| `deprecated` | `published` | `UndeprecateRevision` |

### Run (`instances.status`)

Owner [09.1](https://github.com/keyurgolani/Checkmate/issues/53). States: `scheduled`, `active`, `completed` and `cancelled`. A record starts as `active` by `CreateRun` or `StartRunFromDraft`; `scheduled` by `CreateRun` (for an 08.2 schedule occurrence). Nothing leaves `cancelled`.

| From | To | Cause |
|---|---|---|
| `scheduled` | `active` | `SetStepState` (the first step change starts the run) |
| `active` | `completed` | `CompleteRun` (fires by itself only when a step moves to completed and done reaches executable) |
| `completed` | `active` | `ReopenRun` |
| `scheduled` | `cancelled` | `CancelRun` |
| `active` | `cancelled` | `CancelRun` |

### Run Step (`instanceItems.state`)

Owner [09.1](https://github.com/keyurgolani/Checkmate/issues/53). States: `pending`, `awaiting_approval`, `completed`, `excepted` and `invalidated`. A record starts as `pending` by `CreateRun`, `StartRunFromDraft` or `ApplyRunUpgrade` (a step the upgrade adds). No state is terminal.

| From | To | Cause |
|---|---|---|
| `pending` | `completed` | `SetStepState` |
| `pending` | `awaiting_approval` | `SetStepState` (requests approval) |
| `pending` | `excepted` | `SetStepState` (with one of 08.3's exception kinds) |
| `awaiting_approval` | `completed` | `DecideApproval` (approve) |
| `awaiting_approval` | `pending` | `DecideApproval` (reject, with a rework reason) |
| `completed` | `pending` | `SetStepState` (reopen) |
| `completed` | `invalidated` | `ApplyRunUpgrade`; `SetStepState` (a subject step reopens); `DecideApproval` (rescind) |
| `excepted` | `pending` | `SetStepState` (reopen) |
| `excepted` | `invalidated` | `ApplyRunUpgrade`; `SetStepState` (a subject step reopens); `DecideApproval` (rescind) |
| `invalidated` | `pending` | `SetStepState` (reopen) |

### Run Step (`instanceItems.inclusion`)

Owner [07.3](https://github.com/keyurgolani/Checkmate/issues/49). States: `included`, `retired` and `excluded`. A record starts as `included` by `CreateRun`, `StartRunFromDraft` or `ApplyRunUpgrade` (a step the upgrade adds); `excluded` by `CreateRun` (its 08.3 condition is false) or `ApplyRunUpgrade` (an added step's 08.3 condition is false). No state is terminal.

| From | To | Cause |
|---|---|---|
| `included` | `retired` | `ApplyRunUpgrade` (the new revision drops the step, which keeps its state and history) |
| `retired` | `included` | `ApplyRunUpgrade` (a reversal plan brings the step back) |
| `included` | `excluded` | `ApplyRunUpgrade` (a pending step's 08.3 condition turns false) |
| `excluded` | `included` | `ApplyRunUpgrade` (its 08.3 condition turns true) |

### Share Capability (`shareCapabilities`)

Owner [03.3](https://github.com/keyurgolani/Checkmate/issues/37). Status is derived on read. Rows are never deleted. States: `active`, `suspended`, `revoked`, `expired`, `target_missing` and `restore_invalidated`. A record starts as `active` by `CreateShareCapability`. Nothing leaves `revoked`, `expired`, `target_missing` or `restore_invalidated`.

| From | To | Cause |
|---|---|---|
| `active` | `suspended` | Derived (the creator lost the authority) |
| `suspended` | `active` | Derived (the creator regained the authority before expiry) |
| `active` | `revoked` | `RevokeShareCapability`; `RevokeAllShareCapabilities`; `DeleteAccount` (owner_removed); `DeleteWorkspace` (owner_removed) |
| `active` | `expired` | Time (expiresAt has passed) |
| `active` | `target_missing` | Derived (the target no longer exists) |
| `active` | `restore_invalidated` | Derived (a restore changed the deployment restore epoch) |
| `suspended` | `revoked` | `RevokeShareCapability`; `RevokeAllShareCapabilities`; `DeleteAccount` (owner_removed); `DeleteWorkspace` (owner_removed) |
| `suspended` | `expired` | Time (expiresAt has passed) |
| `suspended` | `target_missing` | Derived (the target no longer exists) |
| `suspended` | `restore_invalidated` | Derived (a restore changed the deployment restore epoch) |

### Other entities

Owners extend these states and never contradict them.

| Entity | States | Owner | Note |
|---|---|---|---|
| Account | `active`, `deletion_pending` and `purged` | [02.1](https://github.com/keyurgolani/Checkmate/issues/32) |  |
| Secret Reference | `active`, `unusable` and `revoked` | [02.2](https://github.com/keyurgolani/Checkmate/issues/33) |  |
| Workspace | `active`, `archived`, `deletion_pending` and `purged` | [03.1](https://github.com/keyurgolani/Checkmate/issues/35) | Baseline `workspaces.isArchived`. |
| Invitation | `pending`, `accepted`, `expired` and `revoked` | [03.1](https://github.com/keyurgolani/Checkmate/issues/35) | Baseline `collaborators.acceptedAt`. |
| Participant | `active`, `suspended`, `revoked` and `expired` | [03.2](https://github.com/keyurgolani/Checkmate/issues/36) |  |
| Template | `active`, `deprecated` and `archived` | [04.3](https://github.com/keyurgolani/Checkmate/issues/40) | `archived` is read-only. |
| Update Notice | `open`, `deferred`, `applied` and `superseded` | [01.1](https://github.com/keyurgolani/Checkmate/issues/29) | 06.3 creates the collection. When a deferral expires, the notice is open again. |
| Assignment | `assigned`, `claimed`, `released`, `unassigned` and `closed` | [08.1](https://github.com/keyurgolani/Checkmate/issues/50) |  |
| Schedule | `active`, `paused` and `ended` | [08.2](https://github.com/keyurgolani/Checkmate/issues/51) |  |
| Evidence | `attached` and `superseded` | [10.1](https://github.com/keyurgolani/Checkmate/issues/56) |  |
| Comment | Defined by the owner | [10.1](https://github.com/keyurgolani/Checkmate/issues/56) | 10.1 defines its states. |
| Catalog Package | `listed` and `unlisted` | [13.1](https://github.com/keyurgolani/Checkmate/issues/65) | The listing state of each version. |
| Installation | `installed`, `quarantined` and `removed` | [13.3](https://github.com/keyurgolani/Checkmate/issues/67) |  |
| Automation Definition | `inactive`, `active`, `paused`, `suspended` and `archived` | [15.3](https://github.com/keyurgolani/Checkmate/issues/73) |  |

Blocked, overdue and offline are projection facets of a run, never statuses. Reopened is an event, never a state. `blueprints.version` carries no state.

### Immutable records

These never change once written, so they have no lifecycle.

| Record | Storage | Owner | Note |
|---|---|---|---|
| Package version | `packageVersions` | [13.1](https://github.com/keyurgolani/Checkmate/issues/65) |  |
| Comment revision | `commentRevisions` | [10.1](https://github.com/keyurgolani/Checkmate/issues/56) |  |
| A revision's Step Definitions | `templateRevisions` | [04.1](https://github.com/keyurgolani/Checkmate/issues/38) |  |
| A revision's Module Includes | `moduleLocks` | [06.1](https://github.com/keyurgolani/Checkmate/issues/44) |  |
| Approval Decision | `approvalDecisions` | [10.2](https://github.com/keyurgolani/Checkmate/issues/57) |  |
| Exception | `stepExceptions` | [08.3](https://github.com/keyurgolani/Checkmate/issues/52) | Withdrawing one is a reopen. |
| Event | `events` | [12.1](https://github.com/keyurgolani/Checkmate/issues/62) |  |
| Audit Entry | `auditEntries` | [12.2](https://github.com/keyurgolani/Checkmate/issues/63) |  |
| Completion Record | `completionRecords` | [10.3](https://github.com/keyurgolani/Checkmate/issues/58) | A newer record supersedes it. |

## Aggregates and counters

Each aggregate carries `aggregateRevision`, which 11.1 bumps once per accepted command. It is never the revision `number`. Steps carry `stepRevision`, and a step command checks it and bumps both counters, so edits to different steps never conflict. Leaves may add aggregates. A Share Capability is not one.

| Aggregate | Root | Members | Never bumps it | Owner |
|---|---|---|---|---|
| Template Draft | `blueprints` | `title`, `description`, `questions`, `resources` and `items` | `owner`, `workspace`, `tags`, `category`, `visibility`, `instanceCount`, `ratingSum` and `ratingCount` | [04.1](https://github.com/keyurgolani/Checkmate/issues/38) |
| Run | `instances` | `instances` and `instanceItems` |  | [07.1](https://github.com/keyurgolani/Checkmate/issues/47) |
| Account Preferences | `accountPreferences` | `accountPreferences` |  | [17.1](https://github.com/keyurgolani/Checkmate/issues/77) |
| Schedule | `schedules` | `schedules` |  | [08.2](https://github.com/keyurgolani/Checkmate/issues/51) |

`PublishRevision`, `CompleteRun`, `ReopenRun`, `CancelRun`, `ApplyRunUpgrade` and `MoveStep` check `aggregateRevision`. `MoveStep` is the reorder op. `SetStepState` and `DecideApproval` check `stepRevision`, as every step command does.

## Retention

DeleteAccount, DeleteWorkspace and ArchiveTemplate are soft deletes. Only the system actor purges, as a 12.1 slice B job with a receipt event.

| Purge | Owner | Follows | When |
|---|---|---|---|
| Account | [02.1](https://github.com/keyurgolani/Checkmate/issues/32) | `DeleteAccount` | after a 30-day grace (19.2 config) |
| Workspace | [03.1](https://github.com/keyurgolani/Checkmate/issues/35) | `DeleteWorkspace` | after a 30-day grace (19.2 config) |
| Template | [04.3](https://github.com/keyurgolani/Checkmate/issues/40) | `ArchiveTemplate` | with its workspace |

A tombstone keeps the id, a name snapshot and `purged`, and fires no cascade, so `restrict` targets never vanish and the purge job deletes `operational` rows itself. Relations from `history` and `proof` rows never cascade, except a run step's inside its run. Such a row keeps a display snapshot or reads the tombstone.

| Class | Meaning | Purge rule | Account purge | Workspace purge | Template purge |
|---|---|---|---|---|---|
| `history` | What happened: runs and run steps today, and later execution records. | Removed, with a receipt, only by 07.2's DeleteRun, the workspace purge (which calls it) or a 12.2 policy job. Account and template purges only detach these rows. | detach | delete | detach |
| `proof` | Records something else proves against. | Kept while referenced, then history. Revisions and completion records never leave proof. Content purges (10.1, 10.3) leave a digest. | keep | keep | keep |
| `ephemeral` | Short-lived state: 07.3's unapplied plans and 20.1's demo tenants. | Deleted when its window ends. Demo tenants go at zero grace with their own revisions, keeping any revision something else references or installs. | window | window | window |
| `operational` | Working state. | Deleted when its leaf's window ends, or with its account, workspace or template. | delete | delete | delete |
| `tombstone` | Accounts, workspaces and templates, which other rows point at. | The purge turns the row into its tombstone. Only demo teardown, and 04.3's delete of a template with no revision or reference, hard-delete one. | tombstone | tombstone | tombstone |

| Collection | Class | Note |
|---|---|---|
| `users` | `tombstone` |  |
| `workspaces` | `tombstone` |  |
| `blueprints` | `tombstone` |  |
| `items` | `operational` |  |
| `collaborators` | `operational` | Frozen by 03.1. |
| `instances` | `history` |  |
| `instanceItems` | `history` |  |
| `notifications` | `operational` | Dropped by 12.2. |
| `activityLog` | `operational` | Dropped by 12.2. |
| `templateRevisions` | `proof` | Planned, [04.1](https://github.com/keyurgolani/Checkmate/issues/38). |
| `runSources` | `proof` | Planned, [07.2](https://github.com/keyurgolani/Checkmate/issues/48). |
| `completionRecords` | `proof` | Planned, [10.3](https://github.com/keyurgolani/Checkmate/issues/58). |

Every baseline relation, plus `instances.workspace` and the planned relations. Eight baseline relations keep cascade.

| Relation | References | Baseline | Target | Executor |
|---|---|---|---|---|
| `workspaces.owner` | `users` | cascade | restrict | [02.1](https://github.com/keyurgolani/Checkmate/issues/32) |
| `blueprints.workspace` | `workspaces` | cascade | restrict | [03.1](https://github.com/keyurgolani/Checkmate/issues/35) |
| `blueprints.owner` | `users` | required | detach, actor snapshot | [02.1](https://github.com/keyurgolani/Checkmate/issues/32) |
| `instances.user` | `users` | cascade | detach, actor snapshot | [02.1](https://github.com/keyurgolani/Checkmate/issues/32) |
| `instances.blueprint` | `blueprints` | required | detach, title snapshot. The run keeps its revision. | [07.2](https://github.com/keyurgolani/Checkmate/issues/48) |
| `items.reference` | `blueprints` | optional | detach, display snapshot | [04.3](https://github.com/keyurgolani/Checkmate/issues/40) |
| `instanceItems.sourceItem` | `items` | optional | detach, display snapshot | [07.2](https://github.com/keyurgolani/Checkmate/issues/48) |
| `instances.workspace` | `workspaces` | new | restrict. Gate 1. | [18.2](https://github.com/keyurgolani/Checkmate/issues/81) |
| `templateRevisions.template` | `blueprints` | planned | restrict | [04.1](https://github.com/keyurgolani/Checkmate/issues/38) |
| `blueprints.currentRevision` | `templateRevisions` | planned | restrict | [04.1](https://github.com/keyurgolani/Checkmate/issues/38) |
| `blueprints.baseRevision` | `templateRevisions` | planned | restrict | [04.1](https://github.com/keyurgolani/Checkmate/issues/38) |
| `instances.templateRevision` | `templateRevisions` | planned | restrict | [04.1](https://github.com/keyurgolani/Checkmate/issues/38) |
| `instances.currentRunSource` | `runSources` | planned | restrict | [07.2](https://github.com/keyurgolani/Checkmate/issues/48) |
| `completionRecords.run` | `instances` | planned | text ID, display snapshot | [10.3](https://github.com/keyurgolani/Checkmate/issues/58) |
| `completionRecords.workspace` | `workspaces` | planned | text ID, display snapshot | [10.3](https://github.com/keyurgolani/Checkmate/issues/58) |
| `items.blueprint` | `blueprints` | cascade | cascade | unchanged |
| `items.parent` | `items` | cascade | cascade | unchanged |
| `collaborators.blueprint` | `blueprints` | cascade | cascade | unchanged |
| `collaborators.user` | `users` | cascade | cascade | unchanged |
| `instanceItems.instance` | `instances` | cascade | cascade, inside its run | unchanged |
| `instanceItems.parent` | `instanceItems` | cascade | cascade, inside its run | unchanged |
| `notifications.user` | `users` | cascade | cascade | unchanged |
| `activityLog.user` | `users` | cascade | cascade | unchanged |

## Decision records

1. [Run](decisions/01.1-run.md)
2. [Blueprint](decisions/01.1-blueprint.md)
3. [Step and Task](decisions/01.1-step-and-task.md)
4. [Section and reference](decisions/01.1-section-and-reference.md)
5. [Step Key](decisions/01.1-step-key.md)
6. [Aggregates and counters](decisions/01.1-aggregates.md)
7. [One revision store](decisions/01.1-revision-store.md)
8. [Retention](decisions/01.1-retention.md)
9. [Navigation and route map](decisions/01.1-ia-map.md)
10. [Visibility split](decisions/01.1-visibility.md)
11. [Personal presentation](decisions/01.1-personal-presentation.md)
