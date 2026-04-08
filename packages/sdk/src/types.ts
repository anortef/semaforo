import type { SemaforoError } from "./errors.js";

export interface SemaforoClientOptions {
  /** Base URL of the Semaforo API (e.g., "https://flags.example.com") */
  baseUrl: string;

  /** API key for authentication (sent as x-api-key header) */
  apiKey: string;

  /** Cache configuration. Pass false to disable. Default: { ttlMs: 60000 } */
  cache?: false | CacheOptions;

  /** Polling configuration. Pass false to disable. Default: { intervalMs: 30000, resources: ["toggles", "values"] } */
  polling?: false | PollingOptions;

  /** Custom fetch implementation. Defaults to globalThis.fetch. */
  fetch?: typeof globalThis.fetch;
}

export interface CacheOptions {
  /** Time-to-live in milliseconds. Default: 60000 (1 minute). */
  ttlMs?: number;
}

export interface PollingOptions {
  /** Polling interval in milliseconds. Default: 30000 (30 seconds). */
  intervalMs?: number;

  /** Which resources to poll. Default: ["toggles", "values"] */
  resources?: Array<"toggles" | "values">;

  /** Callback fired when polled data changes. */
  onUpdate?: (event: PollingUpdateEvent) => void;

  /** Callback fired when a poll request fails. */
  onError?: (error: SemaforoError) => void;
}

export interface PollingUpdateEvent {
  resource: "toggles" | "values";
  data: Record<string, boolean> | Record<string, string>;
  previous: Record<string, boolean> | Record<string, string> | null;
}

export interface RequestOptions {
  /** Skip the client-side cache for this request. */
  skipCache?: boolean;

  /** AbortSignal to cancel this request. */
  signal?: AbortSignal;
}
