# Visibility split

- Status: Accepted
- Contract: 1.0.0
- Supersedes: none
- Superseded by: none

## Context

One `visibility` select (`private`, `public`, `shared`) decides both who can work on a template and whether the catalog lists it ([`pb_schema.json:182-190`](https://github.com/keyurgolani/Checkmate/blob/9019d176ee456477d387d821c88a7c62977eebab/docker/pocketbase/pb_schema.json#L182-L190)). Setting `shared` needs at least one collaborator row ([`template.ts:741-758`](https://github.com/keyurgolani/Checkmate/blob/9019d176ee456477d387d821c88a7c62977eebab/src/lib/services/template.ts#L741-L758)).

## Decision

1. Sharing and catalog listing are separate decisions with separate records. Sharing is a Membership or Grant ([03.1](https://github.com/keyurgolani/Checkmate/issues/35)) or a share link ([03.3](https://github.com/keyurgolani/Checkmate/issues/37)). Listing is `PublishToCatalog` ([13.1](https://github.com/keyurgolani/Checkmate/issues/65)).
2. `visibility` stays until 03.1 turns `shared` into Grants and 13.1 replaces `public` with `PublishToCatalog`.
3. Per PRODUCT.md's sharability model, a template can be private, workspace-shared, link-shared, catalog-published, installed, forked and upgraded. Each has its own authority.

## Consequences

03.1, 03.3 and 13.1 each retire their part of `visibility`. Until then the select works as it does today.
