# Semaforo — Domain Model

## Entities

### User
Represents a platform user who manages apps and toggles.
- `id` — unique identifier
- `email` — unique, lowercase
- `name` — display name
- `passwordHash` — bcrypt hash (authentication not yet implemented)
- `createdAt` — timestamp

### App
A registered application that uses feature toggles.
- `id` — unique identifier
- `name` — display name
- `key` — URL-safe slug, globally unique (e.g. `my-app`)
- `description` — optional
- `createdAt` — timestamp

### Environment
A deployment environment within an app (dev, staging, prod, etc).
- `id` — unique identifier
- `appId` — parent app
- `name` — display name
- `key` — URL-safe slug, unique within app (e.g. `prod`)
- `createdAt` — timestamp

### FeatureToggle
A named feature flag within an app.
- `id` — unique identifier
- `appId` — parent app
- `name` — display name
- `key` — camelCase identifier, unique within app (e.g. `newCheckout`)
- `description` — optional
- `createdAt` — timestamp

### ToggleValue
The state of a toggle in a specific environment.
- `id` — unique identifier
- `toggleId` — references FeatureToggle
- `environmentId` — references Environment
- `enabled` — boolean, defaults to `false`
- `updatedAt` — timestamp

## Invariants

- App keys are globally unique
- Environment keys are unique within an app
- Toggle keys are unique within an app
- A ToggleValue is the intersection of (FeatureToggle x Environment)
- New toggles default to `false` in all environments
- Toggle keys must be camelCase (consumed directly in client JSON)
- App and environment keys must be lowercase with hyphens (used in URLs)

## Aggregate Boundaries

**App** is the primary aggregate root. It owns environments and toggles.
ToggleValue is a cross-reference entity that links a toggle to an environment.
