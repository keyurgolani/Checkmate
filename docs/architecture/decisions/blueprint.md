# Blueprint

- Status: Accepted
- Contract: 1.0.0
- Supersedes: none
- Superseded by: none

## Context

Templates are stored in `blueprints`, and other rows point at them through `blueprint` fields. The code still exports `Blueprint`, `isBlueprint` and `BLUEPRINTS_COLLECTION` as deprecated aliases ([`pocketbase-types.ts:742-796`](https://github.com/keyurgolani/Checkmate/blob/9019d176ee456477d387d821c88a7c62977eebab/src/lib/pocketbase-types.ts#L742-L796)). One notification type is `blueprint_updated` ([`pocketbase-types.ts:32-40`](https://github.com/keyurgolani/Checkmate/blob/9019d176ee456477d387d821c88a7c62977eebab/src/lib/pocketbase-types.ts#L32-L40)), and the `activityLog` resource type accepts `blueprint` but rejects the code's `template` ([`pb_schema.json:718-733`](https://github.com/keyurgolani/Checkmate/blob/9019d176ee456477d387d821c88a7c62977eebab/docker/pocketbase/pb_schema.json#L718-L733)).

## Decision

1. Template is the entity, domain, API and UI term. Blueprint is retired as an entity word.
2. "Blueprint" survives only as the name of the file form that [16.3](https://github.com/keyurgolani/Checkmate/issues/76) adds, a workflow document written as YAML or JSON text.
3. `blueprints` and `blueprint` stay storage names behind one adapter, which the next pull request for [01.1](https://github.com/keyurgolani/Checkmate/issues/29) adds. The adapter maps the canonical `template_updated` notification type and the activity resource types to their stored values.

## Consequences

- The adapter pull request adds the mapping and a ratchet test, which fails when new code adds a legacy name outside `src/lib/domain/`.
- [#1](https://github.com/keyurgolani/Checkmate/issues/1) has the matching exit criterion. Blueprint, Instance and InstanceItem leave the UI and API as entity names, and "blueprint" survives only as the 16.3 file form.
