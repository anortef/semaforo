# Semaforo

Feature toggle management platform.

## Quick Start

```bash
docker compose up
```

This starts:
- **API** at http://localhost:3001
- **Web UI** at http://localhost:5173
- **PostgreSQL** at localhost:5432

## API Documentation (Swagger)

Interactive API docs are available via Swagger UI:

- **Swagger UI:** http://localhost:3001/api/docs
- **OpenAPI JSON:** http://localhost:3001/api/docs.json

The docs are auto-generated from JSDoc `@openapi` annotations in the route files.

## Public API

Client applications consume toggles via:

```
GET /api/public/apps/:appKey/environments/:envKey/toggles
```

Response:
```json
{
  "newCheckout": true,
  "betaSearch": false
}
```

## Development

### With Docker (recommended)

```bash
docker compose up
```

Source code is mounted as volumes — changes reload automatically.

### Without Docker

```bash
npm install
npm run build --workspace=@semaforo/domain

# Start API (requires local PostgreSQL)
DB_HOST=localhost npm run dev --workspace=@semaforo/api

# Start Web
npm run dev --workspace=@semaforo/web
```

### Running Tests

```bash
# All unit tests
npm test

# Domain tests only
npm test --workspace=@semaforo/domain

# API tests only
npm test --workspace=@semaforo/api
```

## Project Structure

```
apps/
  api/          Express.js backend
  web/          React + Vite frontend
packages/
  domain/       Domain entities, repository interfaces, business rules
docker/         Dockerfiles
docs/           Architecture and domain documentation
```

## Documentation

- [Architecture](docs/architecture.md)
- [Domain Model](docs/domain.md)

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/health` | Health check |
| GET | `/api/apps` | List all apps |
| POST | `/api/apps` | Create an app |
| GET | `/api/apps/:appId/environments` | List environments |
| POST | `/api/apps/:appId/environments` | Create environment |
| GET | `/api/apps/:appId/toggles` | List toggles |
| POST | `/api/apps/:appId/toggles` | Create toggle |
| PUT | `/api/toggles/:toggleId/environments/:envId` | Set toggle value |
| GET | `/api/public/apps/:appKey/environments/:envKey/toggles` | Public toggle endpoint |
