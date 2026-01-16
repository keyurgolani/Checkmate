# PocketBase Collection Access Rules

This document describes the access control rules configured for each collection in CheckMate.

## Overview

Access rules are implemented using PocketBase's built-in rule system, which evaluates expressions against the current request context. Rules support:

- `@request.auth.id` - The authenticated user's ID (empty string if unauthenticated)
- `@collection.<name>` - Cross-collection queries
- Field comparisons and logical operators

## Collection Rules

### users (auth collection)

| Operation | Rule                    | Description                             |
| --------- | ----------------------- | --------------------------------------- |
| List      | `""` (empty)            | Anyone can list users                   |
| View      | `""` (empty)            | Anyone can view user profiles           |
| Create    | `""` (empty)            | Anyone can create an account            |
| Update    | `id = @request.auth.id` | Users can only update their own profile |
| Delete    | `id = @request.auth.id` | Users can only delete their own account |

### workspaces

| Operation | Rule                       | Description                                  |
| --------- | -------------------------- | -------------------------------------------- |
| List      | `owner = @request.auth.id` | Users can only list their own workspaces     |
| View      | `owner = @request.auth.id` | Users can only view their own workspaces     |
| Create    | `@request.auth.id != ''`   | Any authenticated user can create workspaces |
| Update    | `owner = @request.auth.id` | Only the owner can update                    |
| Delete    | `owner = @request.auth.id` | Only the owner can delete                    |

**Requirements:** Owner-only access (Requirement 4.1)

### blueprints

| Operation | Rule                                                                                                                 | Description                                                                      |
| --------- | -------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| List/View | `visibility = 'public' OR owner = @request.auth.id OR (visibility = 'shared' AND collaborator with accepted invite)` | Public blueprints visible to all, private to owner only, shared to collaborators |
| Create    | `@request.auth.id != ''`                                                                                             | Any authenticated user can create                                                |
| Update    | `owner = @request.auth.id OR (collaborator with editor/admin permission)`                                            | Owner or editors can update                                                      |
| Delete    | `owner = @request.auth.id`                                                                                           | Only owner can delete                                                            |

**Requirements:**

- Requirement 4.1: Private visibility restricts to owner only
- Requirement 4.2: Public visibility accessible to all (including anonymous)
- Requirement 4.5: Editor/Admin permission levels can update

### items

| Operation | Rule                               | Description                           |
| --------- | ---------------------------------- | ------------------------------------- |
| List/View | Inherits from blueprint visibility | Access follows parent blueprint rules |
| Create    | Owner or editor/admin collaborator | Must have write access to blueprint   |
| Update    | Owner or editor/admin collaborator | Must have write access to blueprint   |
| Delete    | Owner or editor/admin collaborator | Must have write access to blueprint   |

**Requirements:** Items inherit access from their parent blueprint (Requirements 4.1, 4.2, 4.5)

### collaborators

| Operation | Rule                                                  | Description                               |
| --------- | ----------------------------------------------------- | ----------------------------------------- |
| List/View | Blueprint owner OR the collaborator themselves        | Can see own collaboration records         |
| Create    | Blueprint owner only                                  | Only owner can invite collaborators       |
| Update    | Blueprint owner OR (collaborator updating acceptedAt) | Owner can modify, collaborator can accept |
| Delete    | Blueprint owner OR the collaborator themselves        | Owner can revoke, collaborator can leave  |

**Requirements:**

- Requirement 4.4: Owner can add collaborators
- Requirement 4.5: Permission levels enforced
- Requirement 4.6: Access can be revoked

### instances

| Operation | Rule                                                 | Description                             |
| --------- | ---------------------------------------------------- | --------------------------------------- |
| List      | `user = @request.auth.id`                            | Users can only see their own instances  |
| View      | `user = @request.auth.id`                            | Users can only view their own instances |
| Create    | `@request.auth.id != '' AND user = @request.auth.id` | Users create instances for themselves   |
| Update    | `user = @request.auth.id`                            | Only instance owner can update          |
| Delete    | `user = @request.auth.id`                            | Only instance owner can delete          |

**Requirements:** Owner-only access - instances are private by nature (Requirement 4.1)

### instanceItems

| Operation | Rule                | Description                       |
| --------- | ------------------- | --------------------------------- |
| List/View | Instance owner only | Access follows parent instance    |
| Create    | Instance owner only | Only instance owner can add items |
| Update    | Instance owner only | Only instance owner can modify    |
| Delete    | Instance owner only | Only instance owner can delete    |

**Requirements:** Access follows instance owner (Requirement 4.1)

### notifications

| Operation | Rule                      | Description                          |
| --------- | ------------------------- | ------------------------------------ |
| List/View | `user = @request.auth.id` | Users see only their notifications   |
| Create    | `@request.auth.id != ''`  | System can create for any user       |
| Update    | `user = @request.auth.id` | Users can mark as read               |
| Delete    | `user = @request.auth.id` | Users can delete their notifications |

### activityLog

| Operation | Rule                                          | Description                           |
| --------- | --------------------------------------------- | ------------------------------------- |
| List/View | Own activity OR shared blueprint collaborator | Can see activity on shared blueprints |
| Create    | `@request.auth.id != ''`                      | System logs activity                  |
| Update    | `null`                                        | Activity logs are immutable           |
| Delete    | `user = @request.auth.id`                     | Users can delete their own activity   |

## Permission Levels

Collaborators have one of three permission levels:

| Level      | Capabilities                                                |
| ---------- | ----------------------------------------------------------- |
| **viewer** | Read-only access to blueprint and items                     |
| **editor** | Can modify blueprint and items                              |
| **admin**  | Can modify blueprint, items, and manage other collaborators |

## Anonymous Access

Anonymous users (unauthenticated) can:

- ✅ View public blueprints
- ✅ View items in public blueprints
- ❌ Create blueprints or instances
- ❌ Access private or shared blueprints
- ❌ Modify any data

## Security Notes

1. All write operations require authentication (`@request.auth.id != ''`)
2. Cross-collection queries use `@collection.<name>` syntax
3. Collaborator access requires `acceptedAt != ''` (invitation must be accepted)
4. Activity logs are immutable (updateRule is null)
5. Cascade deletes are configured for related records
