# Semaforo — Architecture

## System Overview

Semaforo is a feature toggle management platform. Teams define applications, configure environments (dev, staging, prod), create feature toggles, and assign boolean values per environment. Client applications consume a public API to fetch toggle states.

## Domain Model

```
User
  - id, email, passwordHash, name, createdAt

App
  - id, name, key (slug), description, createdAt
  - owns: Environment[], FeatureToggle[]

Environment
  - id, appId, name, key (slug), createdAt

FeatureToggle
  - id, appId, name, key (slug), description, createdAt

ToggleValue
  - id, toggleId, environmentId, enabled (boolean), updatedAt
```

Key invariants:
- App keys are unique globally
- Environment keys are unique within an app
- Toggle keys are unique within an app
- A ToggleValue is the intersection of (FeatureToggle x Environment)
- Newly created toggles default to `false` in all environments

## Architecture Decisions

### Monorepo with npm workspaces
Simple dependency management, shared types, single CI pipeline.

### Clean Architecture (DDD-inspired)
- **Domain layer** (`packages/domain`): Entities, value objects, repository interfaces. No framework dependencies.
- **Application layer** (`apps/api/src/application`): Use cases / application services. Orchestrates domain objects.
- **Infrastructure layer** (`apps/api/src/infrastructure`): PostgreSQL repositories, Express HTTP controllers, middleware.

### Express.js backend
Minimal, well-understood, no magic. Easy to test.

### React + Vite frontend
Fast dev server, simple setup, TypeScript-first.

### PostgreSQL
Relational data (apps → environments → toggles → values) maps naturally to SQL.

### Vitest for testing
Fast, native TypeScript support, compatible API with Jest.

## Docker Architecture

```
┌─────────────────────────────────────────┐
│            docker-compose               │
├──────────┬──────────┬───────────────────┤
│  api     │  web     │  postgres         │
│  :3001   │  :5173   │  :5432            │
│  Node 20 │  Node 20 │  PostgreSQL 16    │
└──────────┴──────────┴───────────────────┘
```

- All services defined in `docker-compose.yml`
- Source code mounted as volumes for hot reload
- `node_modules` stored in named volumes (not mounted from host) to avoid platform issues
- Database data persisted in a named volume

## Backend Structure

```
apps/api/src/
  application/       # Use cases (CreateApp, CreateToggle, etc.)
  domain/            # Re-exports from packages/domain
  infrastructure/
    http/            # Express routes, controllers, middleware
    persistence/     # PostgreSQL repositories
    config/          # Environment config
  index.ts           # Entry point
```

## Frontend Structure

```
apps/web/src/
  api/               # API client
  components/        # Shared UI components
  pages/             # Route pages (Apps, Toggles, etc.)
  App.tsx
  main.tsx
```

## Testing Strategy

- **Unit tests**: Domain entities, value objects, use cases. No I/O. Run fast.
- **Integration tests**: Repository implementations against a real PostgreSQL (via Docker). HTTP endpoint tests with supertest.
- All tests run with Vitest.
- `npm test` runs unit tests locally.
- `docker compose run api npm run test:integration` runs integration tests against Docker Postgres.
