# frondly API

Back-end and REST API for [frondly.co.za](https://frondly.co.za).

Built with [Fastify](https://fastify.dev) and [MongoDB](https://www.mongodb.com).

## Getting started

Copy `.env.example` to `.env` and set your MongoDB connection string:

```
MONGODB_URI=mongodb://user:password@localhost:27017/frondly-dev
```

Install dependencies and start the development server:

```bash
npm install
npm run dev
```

The API will be available at `http://localhost:3000`.

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start development server with hot reload |
| `npm run build` | Compile TypeScript to `dist/` |
| `npm start` | Run compiled build |
| `npm test` | Run tests once |
| `npm run test:watch` | Run tests in watch mode |
| `npm run lint` | Check for lint errors |
| `npm run format` | Format source files |

## Architecture

Follows clean architecture with three layers:

- **`domain/`** — entities and repository interfaces
- **`application/`** — services that orchestrate domain logic
- **`infrastructure/`** — MongoDB repositories, Fastify HTTP server and plugins
