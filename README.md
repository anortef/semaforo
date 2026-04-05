# Semaforo

Feature toggle management platform with per-app access control, environment-scoped API keys, and an admin panel.

## Quick Start

```bash
docker compose up
```

This starts:
- **API** at http://localhost:3001
- **Web UI** at http://localhost:5173
- **PostgreSQL** at localhost:5432
- **Redis** at localhost:6379

### Required Environment Variables

| Variable | Description | Docker default |
|----------|-------------|----------------|
| `JWT_SECRET` | Secret for signing JWT tokens | `semaforo-dev-secret` |
| `CORS_ORIGIN` | Allowed CORS origin | `http://localhost:5173` |

Both are **required** — the API will fail to start without them.

## Default Credentials

A default admin user is created on first startup:

| Field | Value |
|-------|-------|
| Email | `admin@semaforo.local` |
| Password | `admin` |

## Public API

The simplest way to fetch toggles — the API key determines the environment:

```bash
curl /api/public/toggles -H "x-api-key: sk_your_key_here"
```

Or use the full path if preferred:

```bash
curl /api/public/apps/my-app/environments/prod/toggles \
  -H "x-api-key: sk_your_key_here"
```

API keys must be passed via the `x-api-key` header. Keys are managed per environment in the web UI and are auto-generated when an environment is created.

Response:
```json
{
  "newCheckout": true,
  "betaSearch": false
}
```

## Access Control

### User Roles

| Role | Scope | Description |
|------|-------|-------------|
| `admin` | System-wide | Full access to admin panel, user management, system settings |
| `user` | System-wide | Can access apps they are a member of |

### App Member Roles

Each application has its own member list with per-user roles:

| Role | Description |
|------|-------------|
| `owner` | Full control over the application |
| `editor` | Can modify toggles and environments |
| `viewer` | Read-only access |

Members are managed in each app's **Settings** page.

## Admin Panel

Available at `/admin` in the web UI (admin role required).

- **Users** — Create, edit, disable, delete users; reset passwords; assign system roles
- **Settings** — System-wide configuration (public domain, instance name)
- **Audit Log** — Paginated log of all admin actions with timestamps
- **Health** — Database status, user/app counts, API uptime

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

# Start API (requires local PostgreSQL and Redis)
JWT_SECRET=dev-secret CORS_ORIGIN=http://localhost:5173 \
  npm run dev --workspace=@semaforo/api

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
  shared/       Validation patterns shared between api and web
docker/         Dockerfiles
docs/           Architecture and domain documentation
```

## Security

- JWT authentication with configurable secret (required, no default)
- bcrypt password hashing (10 salt rounds)
- Rate limiting on login (10 req/15min) and public endpoints (100 req/min)
- Helmet security headers
- API keys via `x-api-key` header only (no query params)
- Request body size limited to 1MB
- Audit logging for all admin actions
- Disabled users cannot log in

## Documentation

- [Architecture](docs/architecture.md)
- [Domain Model](docs/domain.md)

## API Endpoints

### Authentication

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/auth/login` | Login (returns JWT) |
| GET | `/api/auth/me` | Current user info |

### Applications

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/apps` | List all apps |
| POST | `/api/apps` | Create an app |
| GET | `/api/apps/:appId` | Get app details |

### Environments

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/apps/:appId/environments` | List environments |
| POST | `/api/apps/:appId/environments` | Create environment (auto-generates API key) |
| PATCH | `/api/environments/:envId` | Update environment |
| DELETE | `/api/environments/:envId/cache` | Clear environment cache |

### Toggles

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/apps/:appId/toggles` | List toggles |
| POST | `/api/apps/:appId/toggles` | Create toggle |
| PUT | `/api/toggles/:toggleId/environments/:envId` | Set toggle value |

### API Keys (per environment)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/environments/:envId/api-keys` | List API keys |
| POST | `/api/environments/:envId/api-keys` | Create API key |
| DELETE | `/api/api-keys/:keyId` | Delete API key |

### App Members

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/apps/:appId/members` | List members |
| POST | `/api/apps/:appId/members` | Add member |
| DELETE | `/api/apps/:appId/members/:memberId` | Remove member |

### Public (API key required)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/public/toggles` | Get toggles (environment resolved from API key) |
| GET | `/api/public/apps/:appKey/environments/:envKey/toggles` | Get toggles (explicit path) |

### Admin (admin role required)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/admin/users` | List users |
| POST | `/api/admin/users` | Create user |
| PATCH | `/api/admin/users/:userId` | Update user |
| DELETE | `/api/admin/users/:userId` | Delete user |
| POST | `/api/admin/users/:userId/reset-password` | Reset password |
| GET | `/api/admin/settings` | List system settings |
| PUT | `/api/admin/settings/:key` | Update setting |
| GET | `/api/admin/audit-log` | Audit log |
| GET | `/api/admin/health` | System health |

### Other

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/health` | Health check (public, for load balancers) |
| GET | `/api/docs` | Swagger UI |
