# Personal presentation

- Status: Accepted
- Contract: 1.0.0
- Supersedes: none
- Superseded by: none

## Context

PRODUCT.md's first principle says simple is a presentation, not a weaker model. A personal checklist should run on the same commands, revisions and records as a team run, without setup it doesn't need.

## Decision

1. Personal presentation applies when the actor alone has access (no `collaborators` rows, or after [03.1](https://github.com/keyurgolani/Checkmate/issues/35) a sole Membership and no Grants) and the revision has no parameters, role slots, evidence or approval.
2. Under it, run setup is a prefilled name and assignment controls are hidden.
3. "Start run" on a `new` or `dirty` draft is one attributed "Release revision N and start", which is `StartRunFromDraft` in [07.1](https://github.com/keyurgolani/Checkmate/issues/47).
4. Schedules don't affect it, since [08.2](https://github.com/keyurgolani/Checkmate/issues/51)'s personal Repeat keeps personal presentation.
5. Commands, revisions, permissions and records are the same as for any other run.

## Consequences

07.1 builds `StartRunFromDraft` and the setup screen. [04.1](https://github.com/keyurgolani/Checkmate/issues/38), 08.2 and [08.3](https://github.com/keyurgolani/Checkmate/issues/52) apply the rule on their own surfaces.
