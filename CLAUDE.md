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
npx vitest run src/path/to/file.test.ts

npm run lint         # Check for lint errors
npm run lint:fix     # Auto-fix lint errors
npm run format       # Format all files with Prettier
npm run format:check # Check formatting without writing
```

## Architecture

The project follows **Clean Architecture** with three layers:

- **`src/domain/`** — Domain models and entities (currently empty; add domain logic here)
- **`src/application/`** — Use cases and business logic orchestration (currently empty)
- **`src/infrastructure/`** — External concerns: HTTP server, databases, external APIs
  - `infrastructure/http/server.ts` — Fastify instance creation and route registration
  - `infrastructure/http/routes/` — Route plugins organized by domain entity

**Entry point:** `src/index.ts` starts the Fastify server on `0.0.0.0:3000`.

Routes are Fastify async plugins registered with a prefix (e.g., `/plants`). New route files should export a `FastifyPluginAsync` and be registered in `server.ts`.

## Code Style

- 4-space indentation, single quotes, no trailing commas, 100-char line width (enforced by Prettier)
- TypeScript strict mode via `@tsconfig/node24`
- ESLint uses flat config (`eslint.config.ts`) with TypeScript type-checked rules and Vitest plugin for test files
