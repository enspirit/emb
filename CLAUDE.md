# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

EMB (Enspirit's Monorepo Builder) is a TypeScript CLI tool for managing monorepos. It provides a unified interface for Docker containers, Kubernetes deployments, tasks, and resources across multi-service projects. Built with oclif framework, published as `@enspirit/emb`.

## Build Commands

```bash
npm run build              # Full build: types + TypeScript + copy proto files
npm run build:types        # Generate TypeScript from JSON Schema
npm run build:ts           # Compile TypeScript with tsc-alias
npm run build:ts:watch     # Watch mode for TypeScript
```

## Test Commands

```bash
npm test                   # Run all tests (unit + integration)
npm run test:unit          # Run only unit tests
npm run test:integration   # Run only integration tests
npx vitest run tests/unit/path/to/test.spec.ts  # Run specific test file
npx vitest run -t "test name pattern"           # Run single test by name
```

Test framework is Vitest with Chai-style assertions (`expect(...).to.equal()`).

## Lint Commands

```bash
npm run lint               # Run ESLint
npm run lint:fix           # Run ESLint with auto-fix
```

## Architecture

### Core Modules (`src/`)

- **cli/** - oclif command definitions. Commands extend `BaseCommand` or `FlavoredCommand`
- **config/** - Configuration loading/validation using JSON Schema and Zod
- **monorepo/** - Core logic: `Monorepo` class, `Component`, plugins system
- **docker/** - `DockerComposeClient` wrapper for docker-compose operations
- **kubernetes/** - Kubernetes client operations
- **operations/** - Abstract operation framework with `AbstractOperation<I, O>` base class

### Key Patterns

**Operation Pattern**: Each action is an Operation class that validates input via Zod schema and implements `_run()`. Execute via `monorepo.run(operation, input)`.

**Command Pattern**: CLI commands extend `BaseCommand`/`FlavoredCommand`, initialize context in `init()`, and execute operations via context.

**Plugin Pattern**: Plugins extend configuration via `extendConfig()`. Built-in plugins: AutoDockerPlugin, DotEnvPlugin, EmbfileLoaderPlugin.

**Context Pattern**: Single `EmbContext` per CLI run containing Monorepo, Docker, Kubernetes clients. Access via `getContext()`.

### Configuration System

Main config file is `.emb.yml` with:
- Project metadata (name, rootDir)
- Plugins configuration
- Environment variables with template expansion: `${env:VAR_NAME:-default}`
- Tasks, components, resources definitions
- Flavors (environment variants using JSON Patch RFC 6902)

### Naming Conventions

- Component names must be unique identifiers
- Task IDs: `component:taskname` or just `taskname`
- Resource IDs: `component:resourcename`
- All paths relative to monorepo root

### Error Classes (`src/errors.ts`)

Custom error hierarchy with `EMBError` base class. Notable: `CliError` (user-friendly with suggestions), `AmbiguousReferenceError`, `CircularDependencyError`, `ShellExitError`.

## Development

- Node.js 22+ (see `.nvmrc`)
- Package manager: pnpm
- Entry point: `./bin/run.js`
- Build output: `/dist/src`
