# PocketBase Setup for CheckMate

This directory contains the PocketBase configuration for CheckMate.

## Collections

### Core Collections (Task 2.1)

#### 1. Users (Auth Collection)

Built-in PocketBase auth collection with custom fields:

- `displayName` (text, max 100 chars) - User's display name
- `avatarUrl` (url) - Profile picture URL
- `preferences` (json) - User preferences (theme, notifications, etc.)

#### 2. Workspaces

Container for organizing blueprints:

- `owner` (relation → users) - Workspace owner
- `name` (text, required, max 100 chars) - Workspace name
- `description` (text, max 500 chars) - Optional description
- `settings` (json) - Workspace settings
- `isArchived` (bool) - Archive status

**Access Rules:**

- List/View: Owner only
- Create: Any authenticated user
- Update/Delete: Owner only

#### 3. Blueprints

Checklist templates:

- `workspace` (relation → workspaces) - Parent workspace
- `owner` (relation → users) - Blueprint creator
- `title` (text, required, 1-200 chars) - Blueprint title
- `description` (editor) - Rich text description
- `visibility` (select: private/public/shared) - Access level
- `category` (text, max 50 chars) - Category for discovery
- `tags` (json) - Array of tags
- `version` (number) - Version number
- `instanceCount` (number) - Number of instances created
- `ratingSum` (number) - Sum of ratings
- `ratingCount` (number) - Number of ratings

**Access Rules:**

- List/View: Public blueprints OR owner (shared rules added in task 2.2)
- Create: Any authenticated user
- Update/Delete: Owner only (editor rules added in task 2.2)

#### 4. Items

Checklist items with hierarchical support:

- `blueprint` (relation → blueprints) - Parent blueprint
- `parent` (relation → items, self) - Parent item for nesting
- `path` (text, required) - Hierarchical path (e.g., "1.2.3")
- `itemType` (select: task/reference) - Item type
- `content` (editor, required) - Item content
- `reference` (relation → blueprints) - Referenced blueprint (for reference items)
- `position` (number, required) - Sort order
- `metadata` (json) - Additional metadata

**Access Rules:**

- Inherits from parent blueprint's visibility

## Setup

### Option 1: Automatic Setup (with admin credentials)

```bash
# Set admin credentials
export PB_ADMIN_EMAIL="admin@example.com"
export PB_ADMIN_PASSWORD="your-password"

# Run setup script
npm run pocketbase:setup
```

### Option 2: Manual Setup via Admin UI

1. Start PocketBase: `npm run pocketbase:up`
2. Open Admin UI: http://127.0.0.1:8090/_/
3. Create admin account (first time only)
4. Import schema from `pb_schema.json` or create collections manually

### Option 3: Import Schema File

1. Open PocketBase Admin UI
2. Go to Settings → Import collections
3. Upload `pb_schema.json`

### Option 4: CI/CD Migration Script

For automated deployments and CI/CD pipelines:

```bash
# Set admin credentials
export PB_ADMIN_EMAIL="admin@example.com"
export PB_ADMIN_PASSWORD="your-password"

# Run migration
npm run pocketbase:migrate
```

The migration script will:

- Wait for PocketBase to be ready (useful when services start in parallel)
- Create new collections that don't exist
- Update existing collections if schema has changed
- Skip collections that are already up-to-date
- Exit with appropriate codes for CI/CD (0=success, 1=connection error, 2=schema error)

## Schema File

The `pb_schema.json` file contains the complete collection definitions that can be imported into PocketBase.

### Exporting Schema Changes

If you make changes via the PocketBase Admin UI, export them to keep the schema file in sync:

```bash
# Set admin credentials
export PB_ADMIN_EMAIL="admin@example.com"
export PB_ADMIN_PASSWORD="your-password"

# Export current schema
npm run pocketbase:export
```

This will update `pb_schema.json` with the current state of all collections.

## TypeScript Types

Type definitions for all collections are in `src/lib/pocketbase-types.ts`:

```typescript
import { User, Workspace, Blueprint, Item } from "@/lib/pocketbase-types";
```
