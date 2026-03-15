# Semaforo — Feature Toggle Platform

A full-stack feature flag management system. Define applications, configure environments (dev/staging/prod), create feature toggles, and manage boolean states per environment. Client apps consume toggles via a cached public API.

## Tech Stack

- **Backend**: Express.js + PostgreSQL 16 + Redis 7 + TypeScript + Swagger (swagger-jsdoc + swagger-ui-express)
- **Frontend**: React 19 + React Router 7 + Vite 6 + TypeScript
- **Monorepo**: npm workspaces
- **Testing**: Vitest (unit + integration separation)
- **Infrastructure**: Docker Compose (postgres, redis, api, web)

## Monorepo Structure

```
apps/
  api/          @semaforo/api     — Express backend (port 3001)
  web/          @semaforo/web     — React frontend (port 5173, proxies /api to api:3001)
packages/
  domain/       @semaforo/domain  — Entities, repository interfaces, business rules (no framework deps)
  shared/       @semaforo/shared  — Validation patterns shared between api and web
docker/                           — Dockerfiles (Node 20-alpine based)
docs/                             — architecture.md, domain.md
tests/                            — Test infrastructure
```

## Domain Model

- **App** — has a globally unique `key` (lowercase-hyphenated)
- **Environment** — belongs to App, unique `key` per app, has `cacheTtlSeconds`
- **FeatureToggle** — belongs to App, unique `key` per app (camelCase)
- **ToggleValue** — intersection of Toggle x Environment, `enabled` boolean (defaults `false`)
- **User** — exists in schema but auth not yet implemented

Key invariants: new toggles default `false` in all environments. Keys are validated via patterns in `@semaforo/shared`.

## Architecture

Clean Architecture / DDD-inspired layers in the API:

```
src/application/     — Use cases (CreateApp, SetToggleValue, GetPublicToggles, etc.)
src/infrastructure/
  http/              — Express routes, controllers, middleware
  persistence/       — PostgreSQL repositories (pg driver, raw SQL)
  cache/             — Redis cache (ioredis)
  config/            — Environment variable loading
```

The domain package has zero runtime dependencies — only entity types, factory functions, and repository interfaces.

## API Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/health` | Health check |
| GET/POST | `/api/apps` | List / create apps |
| GET | `/api/apps/:appId` | Get app details |
| GET/POST | `/api/apps/:appId/environments` | List / create environments |
| GET/POST | `/api/apps/:appId/toggles` | List / create toggles |
| PATCH | `/environments/:envId` | Update environment (name, cacheTtlSeconds) |
| DELETE | `/environments/:envId/cache` | Clear environment cache |
| PUT | `/toggles/:toggleId/environments/:envId` | Set toggle value |
| GET | `/api/public/apps/:appKey/environments/:envKey/toggles` | **Public API** — cached toggle states |

## Development

```bash
# Start all services (postgres, redis, api, web with hot reload)
docker compose up

# Run all tests
npm test

# Run unit tests only (api)
npm run test:unit -w apps/api

# Run integration tests (requires Docker postgres)
npm run test:integration -w apps/api

# Run migrations
npm run db:migrate -w apps/api

# Install a dependency in a specific workspace
npm install <pkg> -w apps/api
```

## Testing

- **Unit tests**: `*.test.ts` (exclude `.integration.test.ts`) — fast, no external deps
- **Integration tests**: `*.integration.test.ts` — 10s timeout, sequential, requires running postgres
- **Frontend tests**: Testing Library + jsdom
- **API tests**: Supertest for HTTP endpoints
- Config files: `vitest.unit.config.ts` and `vitest.integration.config.ts` in `apps/api/`

## Key Design Decisions

- **npm workspaces** over Turborepo/Nx — simplicity, single install, no extra tooling
- **Raw SQL via pg driver** — no ORM, migrations in `apps/api/src/infrastructure/persistence/migrate.ts`
- **Redis caching** — per-environment configurable TTL on the public API endpoint
- **Vite proxy** — frontend dev server proxies `/api` requests to the API container
- **No linter/formatter configured yet**
