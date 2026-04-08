# @semaforo-flags/sdk

Official JavaScript/TypeScript SDK for the [Semaforo](https://github.com/anortef/semaforo) feature toggle platform.

## Installation

```bash
npm install @semaforo-flags/sdk
```

## Quick Start

```typescript
import { SemaforoClient } from "@semaforo-flags/sdk";

const client = new SemaforoClient({
  baseUrl: "https://your-semaforo-instance.com",
  apiKey: "sk_your_api_key",
});

// Check a feature toggle
const darkMode = await client.getToggle("darkMode");
if (darkMode) {
  enableDarkMode();
}

// Get all toggles
const toggles = await client.getToggles();

// Get a string config value
const banner = await client.getValue("bannerMessage");

// Get all string values
const values = await client.getValues();

// Get decrypted secrets (server-side only)
const secrets = await client.getSecrets();

// Clean up when done
client.destroy();
```

## Configuration

```typescript
const client = new SemaforoClient({
  // Required
  baseUrl: "https://your-semaforo-instance.com",
  apiKey: "sk_your_api_key",

  // Optional: client-side cache (enabled by default)
  cache: { ttlMs: 60_000 },  // 1 minute TTL
  // cache: false,            // disable caching

  // Optional: polling (enabled by default)
  polling: {
    intervalMs: 30_000,                  // poll every 30 seconds
    resources: ["toggles", "values"],    // which resources to poll
    onUpdate: (event) => {               // fired when data changes
      console.log(`${event.resource} changed`, event.data);
    },
    onError: (error) => {                // fired on poll failure
      console.error("Poll failed", error);
    },
  },
  // polling: false,          // disable polling

  // Optional: custom fetch (for testing or polyfills)
  fetch: customFetchFn,
});
```

**Caching** and **polling** are enabled by default. Pass `false` to disable either.

## API

### `client.getToggles(options?): Promise<Record<string, boolean>>`

Fetch all boolean feature toggles for the environment.

### `client.getToggle(key, options?): Promise<boolean>`

Fetch a single toggle. Returns `false` if the toggle doesn't exist.

### `client.getValues(options?): Promise<Record<string, string>>`

Fetch all string configuration values.

### `client.getValue(key, options?): Promise<string>`

Fetch a single string value. Returns `""` if the value doesn't exist.

### `client.getSecrets(options?): Promise<Record<string, string>>`

Fetch all decrypted secrets. Use only in server-side contexts.

### `client.clearCache(): void`

Manually clear the client-side cache.

### `client.destroy(): void`

Stop polling and release resources.

### Request Options

All getter methods accept an optional `RequestOptions` object:

```typescript
await client.getToggles({
  skipCache: true,          // bypass client-side cache
  signal: abortController.signal,  // cancel the request
});
```

## Error Handling

```typescript
import {
  SemaforoError,
  UnauthorizedError,
  NotFoundError,
  RateLimitError,
  ServerError,
} from "@semaforo-flags/sdk";

try {
  const toggles = await client.getToggles();
} catch (error) {
  if (error instanceof UnauthorizedError) {
    // Invalid API key (401)
  } else if (error instanceof RateLimitError) {
    // Too many requests (429)
    console.log("Retry after:", error.retryAfterMs);
  } else if (error instanceof ServerError) {
    // Server error (500)
  }
}
```

## Requirements

- Node.js 18+ (or any environment with global `fetch`)
- A running Semaforo instance with API keys configured

## License

[MIT](../../LICENSE)
