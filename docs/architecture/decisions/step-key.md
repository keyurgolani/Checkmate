# Step Key

- Status: Accepted
- Contract: 1.0.0
- Supersedes: none
- Superseded by: none

## Context

A step has no identity beyond its record id. Copying a template or starting a run writes new records, so nothing ties a run step back to its step across revisions, copies or imports.

## Decision

1. A Step Key is an opaque string in its own indexed column. It is never a record id, and it is unique within a template's draft and within each revision.
2. The server mints new keys with `crypto.randomUUID()`. Keys written in a blueprint file ([16.3](https://github.com/keyurgolani/Checkmate/issues/76)) or kept by an import ([16.1](https://github.com/keyurgolani/Checkmate/issues/74), [16.2](https://github.com/keyurgolani/Checkmate/issues/75)) can be any non-empty string of up to 128 characters that isn't a record id.
3. Existing steps get `deriveLegacyStepKey(templateId, itemId)`, the first 16 bytes of SHA-256 over `checkmate-step-key:v1:<templateId>:<itemId>` formatted as a version-8 UUID. Neither id may be empty or contain a colon. The backfill in [04.1](https://github.com/keyurgolani/Checkmate/issues/38) and the v1 reader in 16.1 call it. This replaces the earlier plan to reuse the item id as the key.
4. Duplicating a step mints a new key. Edit, move, kind change, publish, copy, fork, export, import and restore keep it.
5. A run step is keyed by (include path, Step Key).
6. [04.2](https://github.com/keyurgolani/Checkmate/issues/39), [07.3](https://github.com/keyurgolani/Checkmate/issues/49), [13.3](https://github.com/keyurgolani/Checkmate/issues/67) and [16.2](https://github.com/keyurgolani/Checkmate/issues/75) match steps by Step Key only, and only within one Lineage: a template's revisions, copies and forks.

## Consequences

- Minted keys are version-4 UUIDs and derived keys version-8 UUIDs. `isStepKey` checks the opaque-string rule, so a supplied key can't be a record id.
- [`step-key.ts`](../../../src/lib/domain/step-key.ts) exports `deriveLegacyStepKey`, `mintStepKey`, `isStepKey` and `sha256UuidV8`. It uses Web Crypto and imports no `node:` module, because 16.1 runs it in the browser. So `deriveLegacyStepKey` and `sha256UuidV8` are async. Its test pins golden keys computed outside the code. [06.1](https://github.com/keyurgolani/Checkmate/issues/44) adds `deriveLegacyTemplateKey` to the same file.
- Changing the namespace, the derivation or the key rule is a major contract bump.
