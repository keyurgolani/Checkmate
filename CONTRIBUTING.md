# Contributing to CheckMate

Thank you for your interest in contributing to CheckMate! This document provides guidelines and instructions for contributing.

## Getting Started

1. Fork the repository
2. Clone your fork locally
3. Set up the development environment (see below)
4. Create a feature branch from `main`

## Development Setup

### Prerequisites

- Node.js 20+
- Docker and Docker Compose
- npm or yarn

### Local Development

```bash
# Install dependencies
npm install

# Start PocketBase (required for backend)
docker compose -f docker-compose.dev.yml up pocketbase -d

# Start development server
npm run dev
```

### Running Tests

```bash
# Run all tests
npm test

# Run tests with coverage
npm run test:coverage
```

## Code Style

- We use ESLint and Prettier for code formatting
- Run `npm run lint` before committing
- Follow existing code patterns and conventions

## Commit Messages

Use clear, descriptive commit messages:

- `feat: add new feature`
- `fix: resolve bug in component`
- `docs: update README`
- `refactor: improve code structure`
- `test: add unit tests`

## Pull Request Process

1. Ensure your code passes all tests and linting
2. Update documentation if needed
3. Create a pull request with a clear description
4. Wait for review and address any feedback

## Reporting Issues

When reporting issues, please include:

- Clear description of the problem
- Steps to reproduce
- Expected vs actual behavior
- Environment details (OS, browser, Node version)

## Questions?

Feel free to open an issue for any questions or discussions.
