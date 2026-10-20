# Navigation and route map

- Status: Accepted
- Contract: 1.0.0
- Supersedes: none
- Superseded by: none

## Context

The header has Dashboard, Templates, Checklists, Reports, Workspaces and Discover ([`header.tsx:104-141`](https://github.com/keyurgolani/Checkmate/blob/9019d176ee456477d387d821c88a7c62977eebab/src/components/layout/header.tsx#L104-L141)), and the mobile sidebar repeats them with Settings ([`mobile-sidebar.tsx:47-69`](https://github.com/keyurgolani/Checkmate/blob/9019d176ee456477d387d821c88a7c62977eebab/src/components/layout/mobile-sidebar.tsx#L47-L69)).

## Decision

1. Seven destinations, in this order: Today, Library, Runs, Workspaces, Catalog, Activity, Settings.
2. Pages move with permanent 308 redirects, print routes included: `/dashboard` to `/today`, `/templates/**` to `/library/**`, `/checklists/**` to `/runs/**`, `/discover/**` to `/catalog/**`, `/reports` to `/activity/reports`, and `/profile` to `/settings/profile`.
3. [21.1](https://github.com/keyurgolani/Checkmate/issues/89) builds the nav registry from these IDs, labels and order. [21.2](https://github.com/keyurgolani/Checkmate/issues/90) builds the shell and the redirects, except `/dashboard`, which [08.1](https://github.com/keyurgolani/Checkmate/issues/50) adds in the same change that ships Today.
4. Releasing a revision reads "Release revision N". "Publish to catalog" is [13.1](https://github.com/keyurgolani/Checkmate/issues/65)'s action.
5. A projection is an authorized server read model, by default a bounded indexed query ([18.1](https://github.com/keyurgolani/Checkmate/issues/80)). Only audit ([12.2](https://github.com/keyurgolani/Checkmate/issues/63)), reports ([12.3](https://github.com/keyurgolani/Checkmate/issues/64)) and catalog aggregates ([13.2](https://github.com/keyurgolani/Checkmate/issues/66)) are built from events.

## Consequences

The destinations, moves and labels are data in [`vocabulary.ts`](../../../src/lib/domain/vocabulary.ts). A test checks that every current page and print page lands under a destination.
