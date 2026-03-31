# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev          # Start development server with hot reload (tsx watch)
npm run build        # Compile TypeScript to dist/
npm start            # Run compiled production build

npm test             # Run tests once
npm run test:watch   # Run tests in watch mode
# Run a single test file:
npx vitest run test/path/to/file.test.ts

npm run lint         # Check for lint errors
npm run lint:fix     # Auto-fix lint errors
npm run format       # Format all files with Prettier
npm run format:check # Check formatting without writing
```

## Architecture

The project follows **Clean Architecture** with three layers:

- **`src/domain/`** — Domain models and entities
- **`src/application/`** — Services containing genuine business logic (orchestration across multiple repositories, computed fields, etc.)
- **`src/infrastructure/`** — External concerns: HTTP server, databases, external APIs
  - `infrastructure/http/server.ts` — Fastify instance creation and route registration
  - `infrastructure/http/routes/` — Route plugins organized by domain entity

**Entry point:** `src/index.ts` starts the Fastify server on `0.0.0.0:3000`.

Routes are Fastify plugins registered with a prefix (e.g., `/plants`). Use `FastifyPluginAsync` when the plugin registration itself needs `await`; use `FastifyPluginCallback` with `done()` when it does not. All new route files should be registered in `server.ts`.

Route handlers call repositories directly for simple CRUD operations. Services are created only when there is genuine business logic — decision-making, orchestration across multiple repositories, or logic that would be awkward to test at the HTTP layer. Services are never created purely for structural symmetry.

## Testing

Test files live in `test/`, mirroring the `src/` structure with a `.test.ts` suffix. Each layer has a different mocking strategy:

- **`test/infrastructure/http/routes/`** — Build a minimal Fastify app with `fastify.decorate()` to inject a mock repository or service, then use `fastify.inject()` for HTTP-level assertions. No real DB or plugins loaded.
- **`test/infrastructure/db/`** — Use `mongodb-memory-server` for a real in-process MongoDB instance. Start once per file in `beforeAll`, wipe the collection in `beforeEach`.
- **`test/application/`** — Mock the repository interface with `vi.fn()`. No DB or HTTP involved.

## Code Style

- 4-space indentation, single quotes, no trailing commas, 100-char line width (enforced by Prettier)
- TypeScript strict mode via `@tsconfig/node24`
- ESLint uses flat config (`eslint.config.ts`) with TypeScript type-checked rules and Vitest plugin for test files
