# Contributing to cmux

Thanks for your interest in contributing! Here's how to get started.

## Development Setup

```bash
git clone https://github.com/ipdelete/cmux.git
cd cmux
npm install
```

### Prerequisites

- Node.js 18+
- npm 9+
- Copilot CLI and SDK:

```bash
npm install -g @github/copilot @github/copilot-sdk
```

On first launch, use the `/login` command in the Copilot CLI to authenticate.

## Running the App

```bash
npm start
```

## Running Tests

```bash
# Run all tests
npm test

# Run a specific test file
npx jest --testPathPattern="LeftPane" --no-coverage

# Run tests in watch mode
npx jest --watch
```

All pull requests must pass the existing test suite. If you're adding new functionality, please include tests.

## Project Structure

See the [README](README.md#project-structure) for an overview of the codebase layout.

## How to Contribute

### Reporting Bugs

1. Check [existing issues](https://github.com/ipdelete/cmux/issues) to avoid duplicates
2. Open a new issue with:
   - Steps to reproduce
   - Expected vs actual behavior
   - OS and app version

### Suggesting Features

Open an issue with the `enhancement` label describing what you'd like and why.

### Submitting Pull Requests

1. Fork the repo and create a branch from `main`
2. Make your changes — keep them focused and minimal
3. Add or update tests as needed
4. Run `npm test` and ensure all tests pass
5. Open a PR with a clear description of the change

### Code Style

- TypeScript throughout
- React functional components with hooks
- Keep components small — extract custom hooks for complex logic
- See [docs/glossary.md](docs/glossary.md) for consistent terminology (Workspace, Agent, Navigator, etc.)

## Architecture

- **Main process** (`src/main/`): Electron main, services, IPC handlers
- **Renderer** (`src/renderer/`): React app, components, hooks, state management
- **Shared** (`src/shared/`): Types shared between main and renderer
- **Preload** (`src/preload.ts`): IPC bridge between main and renderer

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
