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

## Default Credentials

A default admin user is created on first startup:

| Field | Value |
|-------|-------|
| Email | `admin@semaforo.local` |
| Password | `admin` |

## Public API

Client applications consume toggles via:

```
GET /api/public/apps/:appKey/environments/:envKey/toggles
```

An API key is required. Pass it via header or query parameter:

```bash
# Via header
curl /api/public/apps/my-app/environments/prod/toggles \
  -H "x-api-key: sk_your_key_here"

# Via query parameter
curl "/api/public/apps/my-app/environments/prod/toggles?apiKey=sk_your_key_here"
```

API keys are managed per app in the web UI or via the API (`POST /api/apps/:appId/api-keys`).

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
| POST | `/api/auth/login` | Login (returns JWT) |
| GET | `/api/auth/me` | Current user info |
| GET | `/api/health` | Health check |
| GET | `/api/apps` | List all apps |
| POST | `/api/apps` | Create an app |
| GET | `/api/apps/:appId/environments` | List environments |
| POST | `/api/apps/:appId/environments` | Create environment |
| GET | `/api/apps/:appId/toggles` | List toggles |
| POST | `/api/apps/:appId/toggles` | Create toggle |
| PUT | `/api/toggles/:toggleId/environments/:envId` | Set toggle value |
| GET | `/api/apps/:appId/api-keys` | List API keys |
| POST | `/api/apps/:appId/api-keys` | Create API key |
| DELETE | `/api/api-keys/:keyId` | Delete API key |
| GET | `/api/public/apps/:appKey/environments/:envKey/toggles` | Public toggle endpoint (requires API key) |
