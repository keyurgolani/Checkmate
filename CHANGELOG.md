# Changelog

All notable changes to CheckMate will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Removed

- "Sync with Template" from the run list menu, the run list bulk bar, and the dashboard menu. It reported success without changing the run (#49).
- `POST /api/checklists/[id]/sync` now answers `410 Gone` with code `RUN_SYNC_REMOVED` to every signed-in caller. Anonymous callers still get `401`.
- The `isSynced` field from run API responses (`GET` and `POST /api/checklists`, `GET` and `PUT /api/checklists/[id]`), and the "Modified" run badge that read it. New runs no longer write it. The database column stays until a later migration drops it; the forthcoming migration map (#31) lists it under `MAP:case:never-written`.

## [1.0.0] - 2025-01-15

### Added

- Initial release of CheckMate
- Checklist blueprint creation and management
- Nested checklist references (blueprints within blueprints)
- Collaboration with configurable permissions (viewer, editor, admin)
- Progress tracking across checklist instances
- Public template discovery and search
- Dark/light theme support with customizable color themes
- Responsive design for desktop and mobile
- PocketBase backend with SQLite storage
- Docker deployment support
- Cloudflare Tunnel integration for homelab deployments
- Real-time updates via PocketBase subscriptions
- Export/import functionality for templates
- Workspace organization for templates
