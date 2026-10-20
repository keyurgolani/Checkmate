# Glossary

<!-- Generated from src/lib/domain/ by `npx tsx scripts/transformation/render.ts`. Do not edit; src/lib/domain/vocabulary.test.ts fails when this file is stale. -->

Domain contract `1.0.0`, from [#29](https://github.com/keyurgolani/Checkmate/issues/29) (CHECKMATE-01.1). The files in [`src/lib/domain/`](../../src/lib/domain/) are the source, and this page is their readable form. A leaf cites the contract version it builds on.

Each term has one label (what people see), one domain name (code, commands and APIs), one storage name and one owning leaf. A storage name is what PocketBase holds today, or what a leaf will add. Legacy storage names stay behind one adapter until a migration renames them.

Every link in the governing loop has an entry here: `Template → immutable revision → configured run → execution evidence → approvals → portable completion record`.

## Entities

| Term | Label | Domain name | Storage | Owner | Meaning |
|---|---|---|---|---|---|
| Account | Account | `Account` | `users` | [#32](https://github.com/keyurgolani/Checkmate/issues/32) (CHECKMATE-02.1) | A person's identity, sessions, security settings and personal preferences. |
| Secret Reference | Not shown. Settings lists each one under its own label, which defaults to the provider name. | `SecretReference` | `secret_references`, which [#26](https://github.com/keyurgolani/Checkmate/issues/26) (CHECKMATE-00.2) adds | [#33](https://github.com/keyurgolani/Checkmate/issues/33) (CHECKMATE-02.2) | Points to an encrypted provider or integration credential. The secret never sits in a profile or preference record. |
| Workspace | Workspace | `Workspace` | `workspaces` | [#35](https://github.com/keyurgolani/Checkmate/issues/35) (CHECKMATE-03.1) | Owns members, roles, policies, templates, runs and catalog installations. |
| Template | Template | `Template` | `blueprints` | [#38](https://github.com/keyurgolani/Checkmate/issues/38) (CHECKMATE-04.1) | The reusable workflow definition that a draft and its revisions belong to. |
| Template Draft | Draft | `TemplateDraft` | `blueprints`. Draft fields on the template row, steps in `items`. | [#38](https://github.com/keyurgolani/Checkmate/issues/38) (CHECKMATE-04.1) | The editable copy of a template that its collaborators work on: its title, description, questions, resources and steps. |
| Template Revision | Revision | `TemplateRevision` | `templateRevisions` (planned) | [#38](https://github.com/keyurgolani/Checkmate/issues/38) (CHECKMATE-04.1) | An immutable, numbered release of a draft. It can be published, addressed, diffed and rolled back to. |
| Step Definition | Step | `StepDefinition` | `items`. Draft steps. A revision keeps its steps in its own document. | [#41](https://github.com/keyurgolani/Checkmate/issues/41) (CHECKMATE-05.1) | One schema-validated step in a draft or revision, such as an action, instruction, field, decision, evidence request, approval, automation, section or module include. |
| Module Include | Module include | `ModuleInclude` | `moduleLocks` (planned). The include is a `module-include@1` step; the lock pins its revision. | [#44](https://github.com/keyurgolani/Checkmate/issues/44) (CHECKMATE-06.1) | Binds one published revision of another template, or a compatible revision range, with parameters and role slots, without copying away its provenance. |
| Run | Run | `Run` | `instances` | [#47](https://github.com/keyurgolani/Checkmate/issues/47) (CHECKMATE-07.1) | One execution of one template revision, with its inputs, role bindings, schedule and status. |
| Run Step | Step | `RunStep` | `instanceItems` | [#47](https://github.com/keyurgolani/Checkmate/issues/47) (CHECKMATE-07.1) | One step of a run. It keeps the source revision and Step Key of the step it came from. |
| Participant | Participant | `Participant` | `runParticipants` (planned) | [#36](https://github.com/keyurgolani/Checkmate/issues/36) (CHECKMATE-03.2) | A person, guest, service, automation or agent admitted to a run with a role. |
| Assignment | Assignment | `Assignment` | `assignments` (planned) | [#50](https://github.com/keyurgolani/Checkmate/issues/50) (CHECKMATE-08.1) | Names who should do one run step: a participant or a role slot. |
| Evidence | Evidence | `Evidence` | `evidence` (planned) | [#56](https://github.com/keyurgolani/Checkmate/issues/56) (CHECKMATE-10.1) | A value or file submitted for a run step, kept as its own record. |
| Comment | Comment | `Comment` | `comments` (planned) | [#56](https://github.com/keyurgolani/Checkmate/issues/56) (CHECKMATE-10.1) | A note on a run step. Each edit adds a comment revision. |
| Approval Decision | Approval decision | `ApprovalDecision` | `approvalDecisions` (planned) | [#57](https://github.com/keyurgolani/Checkmate/issues/57) (CHECKMATE-10.2) | An approver's approve, reject or rescind on an approval step, bound to the evidence on record. |
| Exception | Exception | `Exception` | `stepExceptions` (planned) | [#52](https://github.com/keyurgolani/Checkmate/issues/52) (CHECKMATE-08.3) | The recorded reason a run step was skipped, not applicable or done differently. An excepted step counts as done. |
| Event | Event | `Event` | `events` (planned) | [#62](https://github.com/keyurgolani/Checkmate/issues/62) (CHECKMATE-12.1) | An immutable record of one accepted change, with its actor, time, cause and what changed. |
| Audit Entry | Audit entry | `AuditEntry` | `auditEntries` (planned) | [#63](https://github.com/keyurgolani/Checkmate/issues/63) (CHECKMATE-12.2) | A workspace's audit record of one event, kept for the workspace's retention period. |
| Share Capability | Share link | `ShareCapability` | `shareCapabilities` (planned) | [#37](https://github.com/keyurgolani/Checkmate/issues/37) (CHECKMATE-03.3) | A revocable, expiring, optionally authenticated link that grants one declared view and its actions on a template, run, progress view or completion record. |
| Catalog Package | Package | `CatalogPackage` | `packageVersions` (planned) | [#65](https://github.com/keyurgolani/Checkmate/issues/65) (CHECKMATE-13.1) | Signed, versioned template revisions with their dependencies, permissions, compatibility, provenance and reviewable upgrade behavior. |
| Schedule | Schedule | `Schedule` | `schedules` (planned) | [#51](https://github.com/keyurgolani/Checkmate/issues/51) (CHECKMATE-08.2) | Creates runs at set times, one per occurrence, however often delivery retries. |
| Automation Definition | Automation | `AutomationDefinition` | `automations` (planned) | [#73](https://github.com/keyurgolani/Checkmate/issues/73) (CHECKMATE-15.3) | A saved automation that acts only through declared commands, with durable delivery that never repeats an effect. |
| Completion Record | Completion record | `CompletionRecord` | `completionRecords` (planned) | [#58](https://github.com/keyurgolani/Checkmate/issues/58) (CHECKMATE-10.3) | Immutable, portable proof of a completed run: its revision, inputs, decisions, evidence, actors and event chain. |

## Supporting terms

| Term | Label | Domain name | Storage | Owner | Meaning |
|---|---|---|---|---|---|
| Membership | Member | `Membership` | `memberships` (planned) | [#35](https://github.com/keyurgolani/Checkmate/issues/35) (CHECKMATE-03.1) | A principal's role in a workspace. |
| Grant | Not shown. Screens list each person with a role, and [#35](https://github.com/keyurgolani/Checkmate/issues/35) (CHECKMATE-03.1) sums them up as "Shared with N people". | `Grant` | `collaborators`, moving to `memberships` in [#35](https://github.com/keyurgolani/Checkmate/issues/35) (CHECKMATE-03.1) | [#35](https://github.com/keyurgolani/Checkmate/issues/35) (CHECKMATE-03.1) | A person's role on one template, without a workspace membership. |
| Invitation | Invitation | `Invitation` | `collaborators.acceptedAt`, moving to `invitations` in [#35](https://github.com/keyurgolani/Checkmate/issues/35) (CHECKMATE-03.1). Pending while `acceptedAt` is empty. | [#35](https://github.com/keyurgolani/Checkmate/issues/35) (CHECKMATE-03.1) | An offer of a membership or grant that the invitee accepts, declines or lets expire. |
| Guest | Guest | `Guest` | `runParticipants.principalKind = guest` (planned) | [#36](https://github.com/keyurgolani/Checkmate/issues/36) (CHECKMATE-03.2) | A run participant without an account, limited to that run. |
| Parameter | Input | `Parameter` | `blueprints.questions`, moving to `blueprints.parameters` in [#45](https://github.com/keyurgolani/Checkmate/issues/45) (CHECKMATE-06.2) | [#45](https://github.com/keyurgolani/Checkmate/issues/45) (CHECKMATE-06.2) | A typed input a run supplies when it starts. |
| Role Slot | Role | `RoleSlot` | `blueprints.roleSlots` (planned) | [#45](https://github.com/keyurgolani/Checkmate/issues/45) (CHECKMATE-06.2) | A named role in a template that performs or approves steps. A run binds people to it. |
| Condition | Condition | `Condition` | `items.metadata.conditions` | [#52](https://github.com/keyurgolani/Checkmate/issues/52) (CHECKMATE-08.3) | An expression over a run's inputs that decides whether a step is in the run. |
| Module | Module | `Module` | `blueprints` | [#44](https://github.com/keyurgolani/Checkmate/issues/44) (CHECKMATE-06.1) | A template whose published revisions other templates can include. |
| Installation | Installation | `Installation` | `installations`, which [#65](https://github.com/keyurgolani/Checkmate/issues/65) (CHECKMATE-13.1) adds | [#67](https://github.com/keyurgolani/Checkmate/issues/67) (CHECKMATE-13.3) | A workspace's use of one package version. It grants read and run on the version's locked revisions and copies nothing. |
| Fork | Fork | `Fork` | `blueprints.forkedFrom` (planned) | [#67](https://github.com/keyurgolani/Checkmate/issues/67) (CHECKMATE-13.3) | A new template made from an installed package version. It keeps the Step Keys and records its source. |
| Quarantine | Quarantine | `Quarantine` | `catalogListings.quarantined`, which [#65](https://github.com/keyurgolani/Checkmate/issues/65) (CHECKMATE-13.1) adds | [#67](https://github.com/keyurgolani/Checkmate/issues/67) (CHECKMATE-13.3) | A hold on a package version that blocks new installs and runs. Runs already started continue. |
| Progress View | Progress view | `ProgressView` | Not stored. A projection, `run-progress@1`. | [#37](https://github.com/keyurgolani/Checkmate/issues/37) (CHECKMATE-03.3) | A read-only view of one run's progress that a share link can show. |
| Report | Report | `Report` | Not stored. Event-derived projections, one per definition version. | [#64](https://github.com/keyurgolani/Checkmate/issues/64) (CHECKMATE-12.3) | A versioned definition of figures computed from events. |
| Notification | Notification | `Notification` | `notifications`, moving to `inboxItems` in [#63](https://github.com/keyurgolani/Checkmate/issues/63) (CHECKMATE-12.2) | [#63](https://github.com/keyurgolani/Checkmate/issues/63) (CHECKMATE-12.2) | A message to one recipient about an event. |
| Account Preferences | Account settings | `AccountPreferences` | `users.preferences`, moving to `accountPreferences` in [#77](https://github.com/keyurgolani/Checkmate/issues/77) (CHECKMATE-17.1) | [#77](https://github.com/keyurgolani/Checkmate/issues/77) (CHECKMATE-17.1) | An account's presentation and notification settings. It never holds a secret. |
| Principal | Not shown. Screens show the actor's name. | `Principal` | Not stored. Resolved per request. Records keep it as `actorKind` and `actorId`. | [#30](https://github.com/keyurgolani/Checkmate/issues/30) (CHECKMATE-01.2) | Who a request acts as, such as an account, a guest, a link holder, a service, an automation, an agent or the system. |
| Step Key | Step key | `stepKey` | `items.stepKey`, which [#38](https://github.com/keyurgolani/Checkmate/issues/38) (CHECKMATE-04.1) adds. Run steps keep it in `instanceItems.stepKey`, which [#48](https://github.com/keyurgolani/Checkmate/issues/48) (CHECKMATE-07.2) adds. | [#29](https://github.com/keyurgolani/Checkmate/issues/29) (CHECKMATE-01.1) | A step's stable, opaque identity across edits, revisions, copies, forks, exports and runs. |
| Lineage | Not shown. Used only to match steps. | `Lineage` | Not stored. Follows revisions, copies and forks. | [#29](https://github.com/keyurgolani/Checkmate/issues/29) (CHECKMATE-01.1) | A template's revisions plus the copies and forks made from them. Step Keys match only within one lineage. |
| Aggregate revision | Not shown. Sent as an ETag. | `aggregateRevision` | `aggregateRevision`, which [#59](https://github.com/keyurgolani/Checkmate/issues/59) (CHECKMATE-11.1) adds. On `blueprints` (Template Draft) and `instances` (Run). | [#29](https://github.com/keyurgolani/Checkmate/issues/29) (CHECKMATE-01.1) | Counts accepted commands on one aggregate. It is never the revision number. |
| Step revision | Not shown. Sent as an ETag. | `stepRevision` | `stepRevision`, which [#59](https://github.com/keyurgolani/Checkmate/issues/59) (CHECKMATE-11.1) adds. On `items` and `instanceItems`. | [#29](https://github.com/keyurgolani/Checkmate/issues/29) (CHECKMATE-01.1) | Counts accepted commands on one step, so edits to different steps don't conflict. |
| Update Notice | Update available | `UpdateNotice` | `updateNotices`, which [#46](https://github.com/keyurgolani/Checkmate/issues/46) (CHECKMATE-06.3) adds | [#29](https://github.com/keyurgolani/Checkmate/issues/29) (CHECKMATE-01.1) | Says a newer revision exists for an installation, include lock or run, from one revision to another. |
| Deferral | Deferral | `Deferral` | `upgradeDeferrals`, which [#46](https://github.com/keyurgolani/Checkmate/issues/46) (CHECKMATE-06.3) adds | [#29](https://github.com/keyurgolani/Checkmate/issues/29) (CHECKMATE-01.1) | Postpones one update notice, with an actor, a reason and an expiry. When it expires the notice is open again. |
| Projection | Not shown. Screens show its content. | `Projection` | Not stored. A read model, by default a bounded indexed query from [#80](https://github.com/keyurgolani/Checkmate/issues/80) (CHECKMATE-18.1). | [#29](https://github.com/keyurgolani/Checkmate/issues/29) (CHECKMATE-01.1) | An authorized server read model. Only audit, reports and catalog aggregates are built from events. |

## Step kinds

Kind keys are permanent once [#38](https://github.com/keyurgolani/Checkmate/issues/38) (CHECKMATE-04.1) writes revisions.

| Kind | Owner | Meaning |
|---|---|---|
| `task@1` | [#42](https://github.com/keyurgolani/Checkmate/issues/42) (CHECKMATE-05.2) | An action someone does and checks off. Shown as Action. |
| `instruction@1` | [#42](https://github.com/keyurgolani/Checkmate/issues/42) (CHECKMATE-05.2) | Text to read. Nothing to check off. |
| `section@1` | [#42](https://github.com/keyurgolani/Checkmate/issues/42) (CHECKMATE-05.2) | Groups steps. Replaces phases. |
| `legacy-reference@1` | [#42](https://github.com/keyurgolani/Checkmate/issues/42) (CHECKMATE-05.2) | A baseline reference to another template. Run creation resolves it to the target's current published revision. |
| `module-include@1` | [#44](https://github.com/keyurgolani/Checkmate/issues/44) (CHECKMATE-06.1) | Includes one locked revision of a module. |
| `decision@1` | [#52](https://github.com/keyurgolani/Checkmate/issues/52) (CHECKMATE-08.3) | Pick one of a set of options. |
| `field@1` | [#56](https://github.com/keyurgolani/Checkmate/issues/56) (CHECKMATE-10.1) | Record a value. |
| `evidence-request@1` | [#56](https://github.com/keyurgolani/Checkmate/issues/56) (CHECKMATE-10.1) | Ask for evidence, such as a photo or a file. |
| `approval@1` | [#57](https://github.com/keyurgolani/Checkmate/issues/57) (CHECKMATE-10.2) | Approve the steps it names before the run can complete. |
| `automation@1` | [#73](https://github.com/keyurgolani/Checkmate/issues/73) (CHECKMATE-15.3) | A step an automation performs. |

## Retired words

These are no longer entity, alias or UI words. Storage names stay behind the adapter until a migration renames them.

| Word | Use | Note |
|---|---|---|
| Blueprint | Template | Survives only as the name of the YAML or JSON file form that [#76](https://github.com/keyurgolani/Checkmate/issues/76) (CHECKMATE-16.3) adds. |
| Checklist | Run | Run is the domain, API and navigation term. Plain-language copy may still say checklist. |
| Instance | Run | Storage keeps `instances` and `instance` for now. |
| ChecklistItem | Run Step | Code name today. |
| InstanceItem | Run Step | Storage keeps `instanceItems` for now. |
| Task | Step | The kind key `task@1` stays and is shown as Action. |
| Item | Step | Storage keeps `items` for now. |
| Module Package | Module or Catalog Package | A module is a template; a package is what the catalog signs and versions. |
| Phase | Section | Storage keeps the `phase` item type until [#42](https://github.com/keyurgolani/Checkmate/issues/42) (CHECKMATE-05.2) retires the column. |

## Capability

"Capability" always takes a qualifier.

| Term | Owner | Meaning |
|---|---|---|
| Share Capability | [#37](https://github.com/keyurgolani/Checkmate/issues/37) (CHECKMATE-03.3) | What a share link lets its holder see and do. |
| Step capability | [#41](https://github.com/keyurgolani/Checkmate/issues/41) (CHECKMATE-05.1) | A registered step kind and version, such as `task@1`. |
| Provider capability | [#68](https://github.com/keyurgolani/Checkmate/issues/68) (CHECKMATE-14.1) | What an AI or integration provider supports, found by negotiation. |
| Package requirement capability | [#65](https://github.com/keyurgolani/Checkmate/issues/65) (CHECKMATE-13.1) | A step kind a package needs, listed in its `requires`. |

## Navigation

Seven destinations, in this order. [#89](https://github.com/keyurgolani/Checkmate/issues/89) (CHECKMATE-21.1) builds the nav registry from these IDs, labels and order.

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
| `/dashboard` | `/today` | [#50](https://github.com/keyurgolani/Checkmate/issues/50) (CHECKMATE-08.1) |
| `/templates` | `/library` | [#90](https://github.com/keyurgolani/Checkmate/issues/90) (CHECKMATE-21.2) |
| `/checklists` | `/runs` | [#90](https://github.com/keyurgolani/Checkmate/issues/90) (CHECKMATE-21.2) |
| `/discover` | `/catalog` | [#90](https://github.com/keyurgolani/Checkmate/issues/90) (CHECKMATE-21.2) |
| `/reports` | `/activity/reports` | [#90](https://github.com/keyurgolani/Checkmate/issues/90) (CHECKMATE-21.2) |
| `/profile` | `/settings/profile` | [#90](https://github.com/keyurgolani/Checkmate/issues/90) (CHECKMATE-21.2) |

Action labels. N is the revision number.

| Label | Command | Owner |
|---|---|---|
| Release revision N | `PublishRevision` | [#38](https://github.com/keyurgolani/Checkmate/issues/38) (CHECKMATE-04.1) |
| Start run | `CreateRun` | [#47](https://github.com/keyurgolani/Checkmate/issues/47) (CHECKMATE-07.1) |
| Release revision N and start | `StartRunFromDraft` | [#47](https://github.com/keyurgolani/Checkmate/issues/47) (CHECKMATE-07.1) |
| Publish to catalog | `PublishToCatalog` | [#65](https://github.com/keyurgolani/Checkmate/issues/65) (CHECKMATE-13.1) |

## Commands

Every command this contract names, with the leaf that builds it. The matrix rows in [#30](https://github.com/keyurgolani/Checkmate/issues/30) (CHECKMATE-01.2) use these names.

| Command | Owner | Note |
|---|---|---|
| `DeleteAccount` | [#32](https://github.com/keyurgolani/Checkmate/issues/32) (CHECKMATE-02.1) | Soft delete. The account purge follows the grace period. |
| `DeleteWorkspace` | [#35](https://github.com/keyurgolani/Checkmate/issues/35) (CHECKMATE-03.1) | Soft delete. The workspace purge follows the grace period. |
| `CreateShareCapability` | [#37](https://github.com/keyurgolani/Checkmate/issues/37) (CHECKMATE-03.3) |  |
| `RevokeShareCapability` | [#37](https://github.com/keyurgolani/Checkmate/issues/37) (CHECKMATE-03.3) |  |
| `RevokeAllShareCapabilities` | [#37](https://github.com/keyurgolani/Checkmate/issues/37) (CHECKMATE-03.3) | One command for both revoke-all surfaces: a workspace, and the whole deployment on the operator surface. [#30](https://github.com/keyurgolani/Checkmate/issues/30) (CHECKMATE-01.2) gives it a matrix row per surface. |
| `CreateTemplateDraft` | [#38](https://github.com/keyurgolani/Checkmate/issues/38) (CHECKMATE-04.1) | Create, copy, duplicate, import and fork. |
| `DraftCommand` | [#38](https://github.com/keyurgolani/Checkmate/issues/38) (CHECKMATE-04.1) | Any one of the draft ops: `AddStep`, `UpdateStep`, `MoveStep`, `RemoveStep`, `SetQuestion`, `SetInclude`, `SetLock`, `SetHeaderField`. |
| `PublishRevision` | [#38](https://github.com/keyurgolani/Checkmate/issues/38) (CHECKMATE-04.1) | Shown as "Release revision N". |
| `DeprecateRevision` | [#40](https://github.com/keyurgolani/Checkmate/issues/40) (CHECKMATE-04.3) |  |
| `UndeprecateRevision` | [#40](https://github.com/keyurgolani/Checkmate/issues/40) (CHECKMATE-04.3) |  |
| `RestoreRevisionToDraft` | [#40](https://github.com/keyurgolani/Checkmate/issues/40) (CHECKMATE-04.3) | Replays an older revision into the draft, alone or as part of a rollback. |
| `ArchiveTemplate` | [#40](https://github.com/keyurgolani/Checkmate/issues/40) (CHECKMATE-04.3) | Soft delete. The template is purged with its workspace. |
| `CreateRun` | [#47](https://github.com/keyurgolani/Checkmate/issues/47) (CHECKMATE-07.1) |  |
| `StartRunFromDraft` | [#47](https://github.com/keyurgolani/Checkmate/issues/47) (CHECKMATE-07.1) | Releases revision N and starts a run in one attributed command. |
| `DeleteRun` | [#48](https://github.com/keyurgolani/Checkmate/issues/48) (CHECKMATE-07.2) |  |
| `PlanRunUpgrade` | [#49](https://github.com/keyurgolani/Checkmate/issues/49) (CHECKMATE-07.3) |  |
| `ApplyRunUpgrade` | [#49](https://github.com/keyurgolani/Checkmate/issues/49) (CHECKMATE-07.3) |  |
| `DeferRunUpgrade` | [#49](https://github.com/keyurgolani/Checkmate/issues/49) (CHECKMATE-07.3) |  |
| `SetStepState` | [#53](https://github.com/keyurgolani/Checkmate/issues/53) (CHECKMATE-09.1) | Takes the desired state. |
| `CompleteRun` | [#53](https://github.com/keyurgolani/Checkmate/issues/53) (CHECKMATE-09.1) |  |
| `ReopenRun` | [#53](https://github.com/keyurgolani/Checkmate/issues/53) (CHECKMATE-09.1) | Needs an actor and a reason. |
| `CancelRun` | [#53](https://github.com/keyurgolani/Checkmate/issues/53) (CHECKMATE-09.1) |  |
| `DecideApproval` | [#57](https://github.com/keyurgolani/Checkmate/issues/57) (CHECKMATE-10.2) | Approve, reject or rescind. |
| `PublishToCatalog` | [#65](https://github.com/keyurgolani/Checkmate/issues/65) (CHECKMATE-13.1) | Shown as "Publish to catalog". |

## Lifecycles

Each transition names its command, or Time or Derived as its cause. An owner adds states and transitions with a minor bump, and removes or renames one only through a superseding decision record and a major bump.

### Template Draft (`blueprints.draftState`)

Owner [#38](https://github.com/keyurgolani/Checkmate/issues/38) (CHECKMATE-04.1). States: `new`, `dirty` and `clean`. A record starts as `new` by `CreateTemplateDraft`. No state is terminal.

| From | To | Cause |
|---|---|---|
| `new` | `dirty` | `DraftCommand` |
| `clean` | `dirty` | `DraftCommand`; `RestoreRevisionToDraft` (an older revision replaces the draft) |
| `new` | `clean` | `PublishRevision`; `StartRunFromDraft` |
| `dirty` | `clean` | `PublishRevision`; `StartRunFromDraft`; `RestoreRevisionToDraft` (as part of a rollback, which leaves the draft equal to the new revision) |

### Template Revision (`templateLifecycleDecisions`)

Owner [#40](https://github.com/keyurgolani/Checkmate/issues/40) (CHECKMATE-04.3). A revision's state is its latest deprecate or undeprecate decision. Revision rows never change. States: `published` and `deprecated`. A record starts as `published` by `PublishRevision` or `StartRunFromDraft`. No state is terminal.

| From | To | Cause |
|---|---|---|
| `published` | `deprecated` | `DeprecateRevision` |
| `deprecated` | `published` | `UndeprecateRevision` |

### Run (`instances.status`)

Owner [#53](https://github.com/keyurgolani/Checkmate/issues/53) (CHECKMATE-09.1). States: `scheduled`, `active`, `completed` and `cancelled`. A record starts as `active` by `CreateRun` or `StartRunFromDraft`; `scheduled` by `CreateRun` (for a schedule occurrence). Nothing leaves `cancelled`.

| From | To | Cause |
|---|---|---|
| `scheduled` | `active` | `SetStepState` (the first step change starts the run) |
| `active` | `completed` | `CompleteRun` (fires by itself only when a step moves to completed and done reaches executable) |
| `scheduled` | `completed` | `CompleteRun` (a run with no executable steps offers it before any step changes) |
| `completed` | `active` | `ReopenRun` |
| `scheduled` | `cancelled` | `CancelRun` |
| `active` | `cancelled` | `CancelRun` |

### Run Step (`instanceItems.state`)

Owner [#53](https://github.com/keyurgolani/Checkmate/issues/53) (CHECKMATE-09.1). States: `pending`, `awaiting_approval`, `completed`, `excepted` and `invalidated`. A record starts as `pending` by `CreateRun`, `StartRunFromDraft` or `ApplyRunUpgrade` (a step the upgrade adds). No state is terminal.

| From | To | Cause |
|---|---|---|
| `pending` | `completed` | `SetStepState` |
| `pending` | `awaiting_approval` | `SetStepState` (requests approval) |
| `pending` | `excepted` | `SetStepState` (with an exception kind: skip, not-applicable or deviation) |
| `awaiting_approval` | `completed` | `DecideApproval` (approve) |
| `awaiting_approval` | `pending` | `DecideApproval` (reject, with a rework reason) |
| `completed` | `pending` | `SetStepState` (reopen); `DecideApproval` (a rejected approval reopens the subject steps it names); `ApplyRunUpgrade` (reconfirm reopens a changed done step, until [#57](https://github.com/keyurgolani/Checkmate/issues/57) (CHECKMATE-10.2) makes it invalidate) |
| `completed` | `invalidated` | `ApplyRunUpgrade` (reconfirm, once [#57](https://github.com/keyurgolani/Checkmate/issues/57) (CHECKMATE-10.2) lands); `SetStepState` (a subject step of the approval reopens); `DecideApproval` (rescind) |
| `excepted` | `pending` | `SetStepState` (reopen); `DecideApproval` (a rejected approval reopens the subject steps it names); `ApplyRunUpgrade` (reconfirm reopens a changed done step, until [#57](https://github.com/keyurgolani/Checkmate/issues/57) (CHECKMATE-10.2) makes it invalidate) |
| `excepted` | `invalidated` | `ApplyRunUpgrade` (reconfirm, once [#57](https://github.com/keyurgolani/Checkmate/issues/57) (CHECKMATE-10.2) lands) |
| `invalidated` | `pending` | `SetStepState` (reopen) |

### Run Step (`instanceItems.inclusion`)

Owner [#49](https://github.com/keyurgolani/Checkmate/issues/49) (CHECKMATE-07.3). States: `included`, `retired` and `excluded`. A record starts as `included` by `CreateRun`, `StartRunFromDraft` or `ApplyRunUpgrade` (a step the upgrade adds); `excluded` by `CreateRun` (its condition is false) or `ApplyRunUpgrade` (an added step's condition is false). No state is terminal.

| From | To | Cause |
|---|---|---|
| `included` | `retired` | `ApplyRunUpgrade` (the new revision drops the step, which keeps its state and history) |
| `retired` | `included` | `ApplyRunUpgrade` (a reversal plan brings the step back) |
| `included` | `excluded` | `ApplyRunUpgrade` (a pending step's condition turns false) |
| `excluded` | `included` | `ApplyRunUpgrade` (its condition turns true) |
| `excluded` | `retired` | `ApplyRunUpgrade` (the new revision drops the step) |

### Share Capability (`shareCapabilities`)

Owner [#37](https://github.com/keyurgolani/Checkmate/issues/37) (CHECKMATE-03.3). Status is derived on read. Rows are never deleted. States: `active`, `suspended`, `revoked`, `expired`, `target_missing` and `restore_invalidated`. A record starts as `active` by `CreateShareCapability`. Nothing leaves `revoked`, `expired`, `target_missing` or `restore_invalidated`.

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

| Entity | Field | States | Owner | Note |
|---|---|---|---|---|
| Account |  | `active`, `deletion_pending` and `purged` | [#32](https://github.com/keyurgolani/Checkmate/issues/32) (CHECKMATE-02.1) |  |
| Secret Reference | `secret_references.state` | `active`, `unusable` and `revoked` | [#33](https://github.com/keyurgolani/Checkmate/issues/33) (CHECKMATE-02.2) |  |
| Workspace |  | `active`, `archived`, `deletion_pending` and `purged` | [#35](https://github.com/keyurgolani/Checkmate/issues/35) (CHECKMATE-03.1) | Baseline `workspaces.isArchived`. |
| Invitation | `invitations.status` | `pending`, `accepted`, `expired` and `revoked` | [#35](https://github.com/keyurgolani/Checkmate/issues/35) (CHECKMATE-03.1) | Baseline `collaborators.acceptedAt`. |
| Participant | `runParticipants.status` | `active`, `suspended`, `revoked` and `expired` | [#36](https://github.com/keyurgolani/Checkmate/issues/36) (CHECKMATE-03.2) |  |
| Template | `blueprints.lifecycleState` | `active`, `deprecated` and `archived` | [#40](https://github.com/keyurgolani/Checkmate/issues/40) (CHECKMATE-04.3) | `archived` is read-only. |
| Update Notice | `updateNotices.state` | `open`, `deferred`, `applied` and `superseded` | [#29](https://github.com/keyurgolani/Checkmate/issues/29) (CHECKMATE-01.1) | [#46](https://github.com/keyurgolani/Checkmate/issues/46) (CHECKMATE-06.3) creates the collection. When a deferral expires, the notice is open again. |
| Assignment | `assignments.state` | `assigned`, `claimed`, `released`, `unassigned` and `closed` | [#50](https://github.com/keyurgolani/Checkmate/issues/50) (CHECKMATE-08.1) |  |
| Schedule | `schedules.state` | `active`, `paused` and `ended` | [#51](https://github.com/keyurgolani/Checkmate/issues/51) (CHECKMATE-08.2) |  |
| Evidence | `evidence.state` | `attached` and `superseded` | [#56](https://github.com/keyurgolani/Checkmate/issues/56) (CHECKMATE-10.1) |  |
| Comment | `comments.state` | Defined by the owner | [#56](https://github.com/keyurgolani/Checkmate/issues/56) (CHECKMATE-10.1) | Left to the owner, which plans `visible` and `deleted`. |
| Catalog Package | `catalogListings.state` | `listed` and `unlisted` | [#65](https://github.com/keyurgolani/Checkmate/issues/65) (CHECKMATE-13.1) | The listing state of each version. |
| Installation | `installations.state` | `installed`, `quarantined` and `removed` | [#67](https://github.com/keyurgolani/Checkmate/issues/67) (CHECKMATE-13.3) |  |
| Automation Definition | `automations.status` | `inactive`, `active`, `paused`, `suspended` and `archived` | [#73](https://github.com/keyurgolani/Checkmate/issues/73) (CHECKMATE-15.3) |  |

Blocked, overdue and offline are projection facets of a run, never statuses. Reopened is an event, never a state. `blueprints.version` carries no state.

### Immutable records

These never change once written, so they have no lifecycle.

| Record | Storage | Owner | Note |
|---|---|---|---|
| Package version | `packageVersions` | [#65](https://github.com/keyurgolani/Checkmate/issues/65) (CHECKMATE-13.1) |  |
| Comment revision | `commentRevisions` | [#56](https://github.com/keyurgolani/Checkmate/issues/56) (CHECKMATE-10.1) |  |
| A revision's Step Definitions | `templateRevisions` | [#38](https://github.com/keyurgolani/Checkmate/issues/38) (CHECKMATE-04.1) |  |
| A revision's Module Includes | `moduleLocks` | [#44](https://github.com/keyurgolani/Checkmate/issues/44) (CHECKMATE-06.1) |  |
| Approval Decision | `approvalDecisions` | [#57](https://github.com/keyurgolani/Checkmate/issues/57) (CHECKMATE-10.2) |  |
| Exception | `stepExceptions` | [#52](https://github.com/keyurgolani/Checkmate/issues/52) (CHECKMATE-08.3) | Withdrawing one is a reopen. |
| Event | `events` | [#62](https://github.com/keyurgolani/Checkmate/issues/62) (CHECKMATE-12.1) |  |
| Audit Entry | `auditEntries` | [#63](https://github.com/keyurgolani/Checkmate/issues/63) (CHECKMATE-12.2) |  |
| Completion Record | `completionRecords` | [#58](https://github.com/keyurgolani/Checkmate/issues/58) (CHECKMATE-10.3) | A newer record supersedes it. |

## Aggregates and counters

Each aggregate carries `aggregateRevision`, which [#59](https://github.com/keyurgolani/Checkmate/issues/59) (CHECKMATE-11.1) bumps once per accepted command. It is never the revision `number`. Steps carry `stepRevision`, and a command that changes a step bumps both counters. Leaves may add aggregates. A Share Capability is not one.

| Aggregate | Root | Members | Never bumps it | Owner |
|---|---|---|---|---|
| Template Draft | `blueprints` | `title`, `description`, `questions`, `resources` and `items` | `owner`, `workspace`, `tags`, `category`, `visibility`, `instanceCount`, `ratingSum` and `ratingCount` | [#38](https://github.com/keyurgolani/Checkmate/issues/38) (CHECKMATE-04.1) |
| Run | `instances` | `instances` and `instanceItems` |  | [#47](https://github.com/keyurgolani/Checkmate/issues/47) (CHECKMATE-07.1) |
| Account Preferences | `accountPreferences` | `accountPreferences` |  | [#77](https://github.com/keyurgolani/Checkmate/issues/77) (CHECKMATE-17.1) |
| Schedule | `schedules` | `schedules` |  | [#51](https://github.com/keyurgolani/Checkmate/issues/51) (CHECKMATE-08.2) |

What each command checks before it writes, besides its idempotency key. `MoveStep` is the reorder op. `SetInclude` and `SetLock` are refused until [#44](https://github.com/keyurgolani/Checkmate/issues/44) (CHECKMATE-06.1), which sets their check, and a command not listed gets its check from its owner.

| Check | Commands | Note |
|---|---|---|
| `aggregateRevision` | `PublishRevision`, `StartRunFromDraft`, `RestoreRevisionToDraft`, `CompleteRun`, `ReopenRun`, `CancelRun`, `ApplyRunUpgrade` and `MoveStep` | A draft call with several ops checks it too, whatever the ops are. |
| `stepRevision` | `SetStepState`, `DecideApproval`, `UpdateStep` and `RemoveStep` | Edits to different steps never conflict. |
| Last-seen value | `SetHeaderField` and `SetQuestion` | The caller sends the value it last saw, and the write fails only if that field changed. |
| None | `AddStep`, `CreateTemplateDraft` and `CreateRun` | Nothing but the idempotency key. |

## Retention

`DeleteAccount`, `DeleteWorkspace` and `ArchiveTemplate` are soft deletes. Only the system actor purges, with a job on the job runtime from [#62](https://github.com/keyurgolani/Checkmate/issues/62) (CHECKMATE-12.1) that records a receipt event.

| Purge | Owner | Follows | When |
|---|---|---|---|
| Account | [#32](https://github.com/keyurgolani/Checkmate/issues/32) (CHECKMATE-02.1) | `DeleteAccount` | after a 30-day grace period, which operators can change in [#84](https://github.com/keyurgolani/Checkmate/issues/84) (CHECKMATE-19.2) |
| Workspace | [#35](https://github.com/keyurgolani/Checkmate/issues/35) (CHECKMATE-03.1) | `DeleteWorkspace` | after a 30-day grace period, which operators can change in [#84](https://github.com/keyurgolani/Checkmate/issues/84) (CHECKMATE-19.2) |
| Template | [#40](https://github.com/keyurgolani/Checkmate/issues/40) (CHECKMATE-04.3) | `ArchiveTemplate` | with its workspace |

A tombstone keeps the id, a name snapshot and `purged`, and fires no cascade, so `restrict` targets never vanish and the purge job deletes `operational` rows itself. Relations from `history` and `proof` rows never cascade, except a run step's inside its run. Such a row keeps a display snapshot or reads the tombstone.

| Class | Meaning | Purge rule | Account purge | Workspace purge | Template purge |
|---|---|---|---|---|---|
| `history` | What happened: runs and run steps today, and later execution records. | Removed, with a receipt, only by DeleteRun from [#48](https://github.com/keyurgolani/Checkmate/issues/48) (CHECKMATE-07.2), by the workspace purge, which calls it, or by a retention policy job from [#63](https://github.com/keyurgolani/Checkmate/issues/63) (CHECKMATE-12.2). Account and template purges only detach these rows. | detach | delete | detach |
| `proof` | Records something else proves against. | Kept while referenced. Once nothing references it, a proof row is history, except revisions and completion records, which never leave proof. Content purges by [#56](https://github.com/keyurgolani/Checkmate/issues/56) (CHECKMATE-10.1) and [#58](https://github.com/keyurgolani/Checkmate/issues/58) (CHECKMATE-10.3) leave a digest. | keep | keep | keep |
| `ephemeral` | Short-lived state: unapplied upgrade plans from [#49](https://github.com/keyurgolani/Checkmate/issues/49) (CHECKMATE-07.3) and demo tenants from [#86](https://github.com/keyurgolani/Checkmate/issues/86) (CHECKMATE-20.1). | Deleted when its window ends. Demo tenants go at zero grace with their own revisions, keeping any revision something else references or installs. | window | window | window |
| `operational` | Working state. | Deleted when its leaf's window ends, or with its account, workspace or template. | delete | delete | delete |
| `tombstone` | Accounts, workspaces and templates, which other rows point at. | The purge turns the row into its tombstone. Only demo teardown, and the delete in [#40](https://github.com/keyurgolani/Checkmate/issues/40) (CHECKMATE-04.3) of a template with no revision or reference, hard-delete one. | tombstone | tombstone | tombstone |

| Collection | Class | Note |
|---|---|---|
| `users` | `tombstone` |  |
| `workspaces` | `tombstone` |  |
| `blueprints` | `tombstone` |  |
| `items` | `operational` |  |
| `collaborators` | `operational` | Frozen by [#35](https://github.com/keyurgolani/Checkmate/issues/35) (CHECKMATE-03.1). |
| `instances` | `history` |  |
| `instanceItems` | `history` |  |
| `notifications` | `operational` | Dropped by [#63](https://github.com/keyurgolani/Checkmate/issues/63) (CHECKMATE-12.2). |
| `activityLog` | `operational` | Dropped by [#63](https://github.com/keyurgolani/Checkmate/issues/63) (CHECKMATE-12.2). |
| `templateRevisions` | `proof` | Planned, added by [#38](https://github.com/keyurgolani/Checkmate/issues/38) (CHECKMATE-04.1). |
| `runSources` | `proof` | Planned, added by [#48](https://github.com/keyurgolani/Checkmate/issues/48) (CHECKMATE-07.2). |
| `completionRecords` | `proof` | Planned, added by [#58](https://github.com/keyurgolani/Checkmate/issues/58) (CHECKMATE-10.3). |

Every baseline relation, `instances.workspace` and the planned relations. Eight baseline relations keep cascade.

| Relation | References | Baseline | Target | Executor |
|---|---|---|---|---|
| `workspaces.owner` | `users` | cascade | restrict | [#32](https://github.com/keyurgolani/Checkmate/issues/32) (CHECKMATE-02.1) |
| `blueprints.workspace` | `workspaces` | cascade | restrict | [#35](https://github.com/keyurgolani/Checkmate/issues/35) (CHECKMATE-03.1) |
| `blueprints.owner` | `users` | required | detach, actor snapshot | [#32](https://github.com/keyurgolani/Checkmate/issues/32) (CHECKMATE-02.1) |
| `instances.user` | `users` | cascade | detach, actor snapshot | [#32](https://github.com/keyurgolani/Checkmate/issues/32) (CHECKMATE-02.1) |
| `instances.blueprint` | `blueprints` | required | detach, title snapshot. The run keeps its revision. | [#48](https://github.com/keyurgolani/Checkmate/issues/48) (CHECKMATE-07.2) |
| `items.reference` | `blueprints` | optional | detach, display snapshot | [#40](https://github.com/keyurgolani/Checkmate/issues/40) (CHECKMATE-04.3) |
| `instanceItems.sourceItem` | `items` | optional | detach, display snapshot | [#48](https://github.com/keyurgolani/Checkmate/issues/48) (CHECKMATE-07.2) |
| `instances.workspace` | `workspaces` | new | restrict, nullable. [#81](https://github.com/keyurgolani/Checkmate/issues/81) (CHECKMATE-18.2) adds it as an optional field with cascade off. | [#81](https://github.com/keyurgolani/Checkmate/issues/81) (CHECKMATE-18.2) |
| `templateRevisions.template` | `blueprints` | planned | restrict | [#38](https://github.com/keyurgolani/Checkmate/issues/38) (CHECKMATE-04.1) |
| `blueprints.currentRevision` | `templateRevisions` | planned | restrict, nullable. Empty until the first release. | [#38](https://github.com/keyurgolani/Checkmate/issues/38) (CHECKMATE-04.1) |
| `blueprints.baseRevision` | `templateRevisions` | planned | restrict, nullable. Empty until the first release. | [#38](https://github.com/keyurgolani/Checkmate/issues/38) (CHECKMATE-04.1) |
| `instances.templateRevision` | `templateRevisions` | planned | restrict, nullable. Empty for runs started before revisions existed. | [#38](https://github.com/keyurgolani/Checkmate/issues/38) (CHECKMATE-04.1) |
| `instances.currentRunSource` | `runSources` | planned | restrict, nullable. Empty for runs with no recorded source. | [#48](https://github.com/keyurgolani/Checkmate/issues/48) (CHECKMATE-07.2) |
| `runSources.run` | `instances` | planned | detach, display snapshot. Optional with no cascade. DeleteRun's tombstone clears it and keeps the run's id as text. | [#48](https://github.com/keyurgolani/Checkmate/issues/48) (CHECKMATE-07.2) |
| `completionRecords.run` | `instances` | planned | text ID, display snapshot | [#58](https://github.com/keyurgolani/Checkmate/issues/58) (CHECKMATE-10.3) |
| `completionRecords.workspace` | `workspaces` | planned | text ID, display snapshot | [#58](https://github.com/keyurgolani/Checkmate/issues/58) (CHECKMATE-10.3) |
| `items.blueprint` | `blueprints` | cascade | cascade | unchanged |
| `items.parent` | `items` | cascade | cascade | unchanged |
| `collaborators.blueprint` | `blueprints` | cascade | cascade | unchanged |
| `collaborators.user` | `users` | cascade | cascade | unchanged |
| `instanceItems.instance` | `instances` | cascade | cascade, inside its run | unchanged |
| `instanceItems.parent` | `instanceItems` | cascade | cascade, inside its run | unchanged |
| `notifications.user` | `users` | cascade | cascade | unchanged |
| `activityLog.user` | `users` | cascade | cascade | unchanged |

## Decision records

1. [Run](decisions/run.md)
2. [Blueprint](decisions/blueprint.md)
3. [Step and Task](decisions/step-and-task.md)
4. [Section and reference](decisions/section-and-reference.md)
5. [Step Key](decisions/step-key.md)
6. [Aggregates and counters](decisions/aggregates.md)
7. [One revision store](decisions/revision-store.md)
8. [Retention](decisions/retention.md)
9. [Navigation and route map](decisions/ia-map.md)
10. [Visibility split](decisions/visibility.md)
11. [Personal presentation](decisions/personal-presentation.md)
