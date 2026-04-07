# Semaforo

Feature toggle management platform with A/B testing, string values, encrypted secrets, per-app access control, request metrics, and an admin panel.

## Quick Start

```bash
./start.sh
```

This generates a `.env` file with random secrets (if missing) and starts all services in detached mode.

Alternatively, start manually:

```bash
docker compose up -d
```

Services:
- **API** at http://localhost:3001
- **Web UI** at http://localhost:5173
- **PostgreSQL** at localhost:5432
- **Redis** at localhost:6379

### Environment Variables

Configured via `.env` file (created automatically by `start.sh`):

| Variable | Description | Required |
|----------|-------------|----------|
| `JWT_SECRET` | Secret for signing JWT tokens | Yes |
| `ENCRYPTION_KEY` | 32-byte hex key for AES-256-GCM secret encryption | No (secrets feature disabled without it) |
| `CORS_ORIGIN` | Allowed CORS origin | Yes (defaults to `http://localhost:5173` in docker-compose) |

`JWT_SECRET` and `CORS_ORIGIN` are **required** — the API will fail to start without them. `ENCRYPTION_KEY` is optional — if omitted, the secrets feature is simply unavailable.

## Default Credentials

A default admin user is created on first startup:

| Field | Value |
|-------|-------|
| Email | `admin@semaforo.local` |
| Password | `admin` |

## Features

### Boolean Toggles
On/off switches per environment. Manage via the Toggles page — grid of toggle x environment with instant switching.

### String Values
Configurable text values per environment (e.g., banner messages, feature labels). Managed on a dedicated String Values page with per-environment inputs and a Save button.

### Encrypted Secrets
Per-environment encrypted secrets (e.g., database passwords, API tokens). Values are encrypted at rest with AES-256-GCM using a master key. Each encryption uses a unique IV.

- **Admin UI**: Secrets page per app — create secrets, set values per environment, masked display with a Reveal button
- **Reveal is audit-logged** — every reveal action is recorded in the audit log
- **Public API**: Client apps fetch decrypted secrets via API key, same pattern as toggles

```bash
curl /api/public/secrets -H "x-api-key: sk_your_key_here"
```

Response:
```json
{
  "databasePassword": "s3cret",
  "stripeApiKey": "sk_live_..."
}
```

### A/B Testing
Per-toggle, per-environment rollout percentages (0-100%). Click "A/B Testing" on any boolean toggle to expand the rollout configuration. Set a percentage per environment and click "Apply".

- **With `x-user-id` header**: deterministic — same user always gets the same result (hash-based bucketing)
- **Without `x-user-id`**: random per request

```bash
# Deterministic A/B for a specific user
curl /api/public/toggles \
  -H "x-api-key: sk_..." \
  -H "x-user-id: user-123"
```

### Metrics
Per-app metrics page with:
- Toggle and environment counts
- Cache status, size, and remaining TTL per environment
- Request counts: unflushed (Redis), 5m, 1h, 1d, 1w, 1mo
- Auto-refreshes every 5 seconds

Request tracking uses Redis INCR (zero latency) with a background flush to Postgres every 5 minutes.

### Audit Log
Every resource creation and status change is logged:
- App/environment/toggle creation
- Toggle enable/disable/rollout changes
- Member additions/removals
- Admin user and settings changes
- System imports

Per-app audit log (in each app's sidebar) and system-wide audit log (admin panel). All entries show resolved resource names, not UUIDs.

### Export / Import
- **Per-app**: Export/Import buttons on the app Settings page
- **Admin**: Export All / Import on the admin Settings page

Full instance export includes users (with bcrypt hashes), system settings, apps, environments, toggles, toggle values, rollout percentages, secrets (encrypted), app members, and API keys. The seed admin is excluded — fresh installs create it automatically.

### Scheduled Backups
Automated compressed backups (`.json.gz`) stored in the `./backups` volume. Configured from the admin Settings page:

- **Schedule**: Every hour, 12 hours, daily, or custom interval in hours
- **Retention**: 7 days, 15 days, 30 days, or custom number of days
- **Manual backup**: "Backup Now" button for on-demand backups
- **History**: Table showing all backup files with size and timestamp
- **Validate**: Dry-run a backup to check structure, count entities, and detect conflicts before restoring
- **Restore**: Restore a backup with a confirmation modal warning that existing conflicting data may be overwritten

Old backups are automatically pruned based on the retention setting. Backups are bind-mounted at `./backups` so they persist outside Docker.

### Themes
Five built-in themes (Dark, Light, Midnight, Forest, Sunset) selectable from colored dots in the sidebar footer. Persisted in localStorage.

## Public API

The API key determines the environment. All endpoints use `x-api-key` header. Keys are managed per environment and auto-generated on environment creation.

### Boolean Toggles

```bash
curl /api/public/toggles -H "x-api-key: sk_your_key_here"
```

Single toggle: `/api/public/toggles/myToggle`

```json
{ "newCheckout": true, "betaSearch": false }
```

### String Values

```bash
curl /api/public/values -H "x-api-key: sk_your_key_here"
```

Single value: `/api/public/values/bannerMessage`

```json
{ "bannerMessage": "Welcome!", "maintenanceNote": "" }
```

### Secrets

```bash
curl /api/public/secrets -H "x-api-key: sk_your_key_here"
```

```json
{ "databasePassword": "s3cret", "stripeApiKey": "sk_live_..." }
```

### Full-path alternatives (backwards compatible)

```bash
curl /api/public/apps/my-app/environments/prod/toggles \
  -H "x-api-key: sk_your_key_here"

curl /api/public/apps/my-app/environments/prod/secrets \
  -H "x-api-key: sk_your_key_here"
```

## Access Control

### User Roles

| Role | Scope | Description |
|------|-------|-------------|
| `admin` | System-wide | Full access to admin panel, user management, system settings |
| `user` | System-wide | Can access apps they are a member of |

### App Member Roles

| Role | Description |
|------|-------------|
| `owner` | Full control over the application |
| `editor` | Can modify toggles and environments |
| `viewer` | Read-only access |

Members are managed in each app's **Settings** page.

## Admin Panel

Available at `/admin` in the web UI (admin role required).

- **Users** — Create, edit, disable, delete users; reset passwords; assign system roles
- **Settings** — Public domain, instance name, configurable rate limits, export/import
- **Audit Log** — Paginated log of all actions with resolved resource names
- **Health** — Database status, memory (MB), CPU load average (1m/5m/15m), uptime, user/app counts

## Security

- JWT authentication with configurable secret (required, no default)
- AES-256-GCM encryption for secrets at rest (unique IV per value, 32-byte master key)
- bcrypt password hashing (10 salt rounds)
- Two-tier rate limiting: generous for cached responses (configurable, default 100k/min), strict for DB hits (configurable, default 100/min)
- Rate limits configurable via admin settings, stored in Postgres, served from Redis
- Helmet security headers
- API keys via `x-api-key` header only
- Request body size limited to 1MB
- Audit logging for all resource mutations
- Disabled users cannot log in

## Development

### With Docker (recommended)

```bash
./start.sh
```

Source code is mounted as volumes — changes reload automatically.

### Without Docker

```bash
npm install
npm run build --workspace=@semaforo/domain

# Start API (requires local PostgreSQL and Redis)
JWT_SECRET=dev-secret CORS_ORIGIN=http://localhost:5173 \
  ENCRYPTION_KEY=$(openssl rand -hex 32) \
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
| GET | `/api/apps/:appId/metrics` | App metrics (toggles, cache, requests) |
| GET | `/api/apps/:appId/audit-log` | App audit log |
| GET | `/api/apps/:appId/export` | Export app as JSON |
| POST | `/api/apps/import` | Import app from JSON |

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
| POST | `/api/apps/:appId/toggles` | Create toggle (type: boolean or string) |
| PUT | `/api/toggles/:toggleId/environments/:envId` | Set value (enabled, stringValue, rolloutPercentage) |
| GET | `/api/apps/:appId/toggle-values` | All toggle values with timestamps |

### Secrets

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/apps/:appId/secrets` | List secrets (metadata only) |
| POST | `/api/apps/:appId/secrets` | Create secret |
| DELETE | `/api/secrets/:secretId` | Delete secret |
| PUT | `/api/secrets/:secretId/environments/:envId` | Set secret value (encrypted) |
| GET | `/api/secrets/:secretId/environments/:envId` | Get masked value |
| POST | `/api/secrets/:secretId/environments/:envId/reveal` | Reveal full value (audit-logged) |

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
| GET | `/api/public/toggles` | Get boolean toggles |
| GET | `/api/public/toggles/:toggleKey` | Get single toggle |
| GET | `/api/public/values` | Get string values |
| GET | `/api/public/values/:valueKey` | Get single value |
| GET | `/api/public/secrets` | Get decrypted secrets |
| GET | `/api/public/apps/:appKey/environments/:envKey/toggles` | Get toggles (full path) |
| GET | `/api/public/apps/:appKey/environments/:envKey/toggles/:toggleKey` | Get single toggle (full path) |
| GET | `/api/public/apps/:appKey/environments/:envKey/secrets` | Get secrets (full path) |

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
| GET | `/api/admin/health` | API service health |
| GET | `/api/admin/backups` | List backup files |
| POST | `/api/admin/backups` | Create backup now |
| POST | `/api/admin/backups/:filename/validate` | Dry-run validate a backup |
| POST | `/api/admin/backups/:filename/restore` | Restore from a backup |
| GET | `/api/admin/export` | Export full instance |
| POST | `/api/admin/import` | Import full instance |

### Other

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/health` | Health check (public, for load balancers) |
| GET | `/api/docs` | Swagger UI |

## License

[MIT](LICENSE)
