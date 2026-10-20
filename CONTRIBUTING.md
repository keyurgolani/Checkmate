# Contributing to CheckMate

Thank you for your interest in contributing to CheckMate! This document provides guidelines and instructions for contributing.

## Getting Started

1. Fork the repository
2. Clone your fork locally
3. Set up the development environment (see below)
4. Create a feature branch from `next`; pull requests target `next`

## Development Setup

### Prerequisites

- Node.js 24 (pinned in `.nvmrc`, so `nvm use` picks it)
- macOS or Linux on amd64 or arm64 for the backend tests (on Windows, use WSL)
- Docker and Docker Compose, to run the app stack locally

### Local Development

```bash
# Install dependencies exactly as locked
npm ci

# Start PocketBase (required for the app)
docker compose -f docker-compose.dev.yml up pocketbase -d

# Start development server
npm run dev
```

### Running Tests

`npm test` needs no running services, accounts or environment variables. The backend suites start their own PocketBase: the version pinned in `docker/pocketbase/Dockerfile`, downloaded once into `.cache/pocketbase/` and checked against `docker/pocketbase/pocketbase.sha256`, on a free loopback port with a throwaway data directory and superuser. They never touch the dev compose database on port 8090.

```bash
npm test               # unit and backend suites
npm run test:unit      # unit suites, no PocketBase
npm run test:backend   # backend suites on the fixture
npm run test:coverage  # all suites with coverage
```

Fixture failures name the cause and the fix: `FIXTURE_DOWNLOAD_FAILED`, `FIXTURE_CHECKSUM_MISMATCH`, `FIXTURE_UNSUPPORTED_PLATFORM`, `FIXTURE_PORT_IN_USE`, `FIXTURE_START_TIMEOUT`, `FIXTURE_START_FAILED` or `FIXTURE_SCHEMA_FAILED`.

For Playwright or other local tools, `npm run fixture -- start` starts a fixture with the baseline schema and prints its URL. Its superuser goes to `.cache/pocketbase/fixture/superuser.json` (mode 0600), and `npm run fixture -- stop` stops it and deletes the file.

A test that fails on a known product defect is marked `it.fails`, with a one-line comment naming the issue that fixes it, such as `// fails until #28 slice D`. CI fails on any skipped or todo test.

A change to an access rule updates its pin in `src/test/access-rule-pins.json` in the same PR. The failing test prints the served digest.

The `blueprints`, `items`, `instances` and `instanceItems` collections, the `blueprint`, `instance` and `sourceItem` fields, and the stored values built on them are legacy storage names. New code names legacy storage values only through `src/lib/domain/storage.ts`: collections through `Collections`, rows through `src/lib/domain/records.ts`. A ratchet test counts legacy names, deprecated aliases and the deprecated `Collections` keys per file against `src/lib/domain/legacy-name-baseline.ts`. When you remove one, lower that file's entry. CI fails a change that raises an entry or adds one, and a file you move keeps its count under its new path. `npx tsc --noEmit -p src/lib/domain/tsconfig.json` runs the record type test.

### Theme fonts

Theme Studio fonts ship with the app. Each web font in `src/lib/themes/font-themes.ts` has its latin-subset woff2 files, one `@font-face` stylesheet and its license under `public/fonts/<id>/`, and `scripts/fonts/manifest.json` records each file's source URL and SHA-256. Nothing fetches a font at build or run time.

```bash
node scripts/fonts/fetch-fonts.mjs           # fetch the families in FAMILIES again; public/fonts and the manifest change only once every download succeeds
node scripts/fonts/fetch-fonts.mjs --verify  # download every recorded file again and check it against the manifest
```

The unit suite checks the committed files against the manifest offline. `next.config.ts` serves `/fonts` with a one-day cache and a week of `stale-while-revalidate`, since the file names stay the same when a font is refetched.

## Continuous Integration

Every pull request to `main` or `next` runs `.github/workflows/ci.yml`, and its `aggregate` check is the one that must pass. The `scope` job classifies the changed files with `.github/ci-scope.json`:

- Docs only (`*.md`, `docs/`): only the always-on `scope` and `checks` jobs run.
- Contract docs (`.md` files under `docs/architecture/` and `docs/transformation/`): unit, because unit tests check them against the data they describe.
- Docker files: the two image builds.
- The schema (`docker/pocketbase/pb_schema.json`): unit, backend and the image builds. The retention test reads it.
- Code: lint, unit, backend and build.
- Toolchain (package files, `.nvmrc`, configs, `.github/`, `scripts/ci/`): every job. Pushes run every job too.

When a job fails, the `aggregate` summary names it, gives its failure class, and prints a command that reproduces it from a fresh clone, for example:

```bash
git clone https://github.com/keyurgolani/Checkmate.git checkmate-ci && cd checkmate-ci \
  && git fetch origin pull/<number>/head && git checkout --detach <sha> \
  && npm ci && npm run test:backend
```

Until the lint baseline lands, CI lints the files a change touches (`node scripts/ci/lint-changed.mjs --base <sha>`), and a change may not add comments that turn ESLint rules off or set them inline. `npm run build` must pass with both PocketBase URLs pointing at `http://127.0.0.1:9`, where nothing listens, and with the Google Fonts hosts pointed at loopback. `node scripts/fonts/check-font-hosts.mjs` then fails the job if anything the build serves loads a font from another host.

Images publish only from the `publish` job, after `aggregate` passes: for a `v*` tag, or for a push to `next` while the owner enables it.

## Code Style

- ESLint is the style gate; run `npx eslint <files you changed>` before committing
- Follow existing code patterns and conventions

## Commit Messages

Use clear, descriptive commit messages:

- `feat: add new feature`
- `fix: resolve bug in component`
- `docs: update README`
- `refactor: improve code structure`
- `test: add unit tests`

## Pull Request Process

1. Ensure your code passes `npm test` and lint on the files you changed
2. Update documentation if needed
3. Create a pull request against `next` with a clear description
4. Wait for review and address any feedback

## Reporting Issues

When reporting issues, please include:

- Clear description of the problem
- Steps to reproduce
- Expected vs actual behavior
- Environment details (OS, browser, Node version)

## Questions?

Feel free to open an issue for any questions or discussions.
