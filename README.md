# frondly API

Back-end and REST API for [frondly.co.za](https://frondly.co.za).

Built with [Fastify](https://fastify.dev) and [MongoDB](https://www.mongodb.com).

## Getting started

Copy `.env.example` to `.env` and fill in the values:

```
MONGODB_URI=mongodb://user:password@localhost:27017/frondly-dev
AUTH0_DOMAIN=your-tenant.eu.auth0.com
AUTH0_AUDIENCE=https://api.frondly.co.za
CORS_ORIGIN=http://localhost:5173,https://frondly.co.za
PHOTO_STORAGE_PATH=./uploads
# Used to sign photo URLs
PHOTO_SIGNING_SECRET=replace-with-a-long-random-secret

# optional
LOG_LEVEL=info
LOG_FILE=./logs/api.log
```

`LOG_FILE` enables a rolling file sink alongside stdout (10 MB per file, 5 files retained). If omitted, logs go to stdout only. `LOG_LEVEL` defaults to `info`; set to `debug` to see internal service decisions (recurrence recomputation, care log validation, etc.).

Install dependencies and start the development server:

```bash
npm install
npm run dev
```

The API will be available at `http://localhost:3000`.

## Scripts

| Command              | Description                                           |
|----------------------|-------------------------------------------------------|
| `npm run dev`        | Start development server with hot reload              |
| `npm run build`      | Compile TypeScript to `dist/`                         |
| `npm start`          | Run compiled build                                    |
| `npm run seed`       | Seed system care types into the database (idempotent) |
| `npm test`           | Run tests once                                        |
| `npm run test:watch` | Run tests in watch mode                               |
| `npm run lint`       | Check for lint errors                                 |
| `npm run format`     | Format source files                                   |

## Architecture

Follows clean architecture with three layers:

- **`domain/`** — entities and repository interfaces
- **`application/`** — services that orchestrate domain logic
- **`infrastructure/`** — MongoDB repositories, Fastify HTTP server and plugins
