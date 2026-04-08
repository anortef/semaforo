import type { SemaforoClientOptions, RequestOptions } from "./types.js";
import { createFetcher, type Fetcher } from "./fetcher.js";
import { TtlCache } from "./cache.js";
import { createPoller, type Poller } from "./poller.js";

const DEFAULT_CACHE_TTL_MS = 60_000;
const DEFAULT_POLL_INTERVAL_MS = 30_000;
const DEFAULT_POLL_RESOURCES: Array<"toggles" | "values"> = ["toggles", "values"];

export class SemaforoClient {
  private readonly fetcher: Fetcher;
  private readonly cache: TtlCache | null;
  private readonly poller: Poller | null;

  constructor(options: SemaforoClientOptions) {
    if (!options.baseUrl) throw new Error("baseUrl is required");
    if (!options.apiKey) throw new Error("apiKey is required");

    const fetchFn = options.fetch ?? globalThis.fetch;
    if (!fetchFn) throw new Error("fetch is not available. Provide a fetch implementation via the fetch option.");

    this.fetcher = createFetcher({
      baseUrl: options.baseUrl,
      apiKey: options.apiKey,
      fetch: fetchFn,
    });

    this.cache = options.cache === false
      ? null
      : new TtlCache(options.cache?.ttlMs ?? DEFAULT_CACHE_TTL_MS);

    if (options.polling === false) {
      this.poller = null;
    } else {
      const pollingOpts = options.polling ?? {};
      this.poller = createPoller({
        fetcher: this.fetcher,
        cache: this.cache,
        intervalMs: pollingOpts.intervalMs ?? DEFAULT_POLL_INTERVAL_MS,
        resources: pollingOpts.resources ?? DEFAULT_POLL_RESOURCES,
        onUpdate: pollingOpts.onUpdate,
        onError: pollingOpts.onError,
      });
      this.poller.start();
    }
  }

  async getToggles(options?: RequestOptions): Promise<Record<string, boolean>> {
    return this.cachedGet<Record<string, boolean>>("/toggles", options);
  }

  async getToggle(key: string, options?: RequestOptions): Promise<boolean> {
    const result = await this.cachedGet<Record<string, boolean>>(`/toggles/${encodeURIComponent(key)}`, options);
    return result[key] ?? false;
  }

  async getValues(options?: RequestOptions): Promise<Record<string, string>> {
    return this.cachedGet<Record<string, string>>("/values", options);
  }

  async getValue(key: string, options?: RequestOptions): Promise<string> {
    const result = await this.cachedGet<Record<string, string>>(`/values/${encodeURIComponent(key)}`, options);
    return result[key] ?? "";
  }

  async getSecrets(options?: RequestOptions): Promise<Record<string, string>> {
    return this.cachedGet<Record<string, string>>("/secrets", options);
  }

  clearCache(): void {
    this.cache?.clear();
  }

  destroy(): void {
    this.poller?.stop();
    this.cache?.clear();
  }

  private async cachedGet<T>(path: string, options?: RequestOptions): Promise<T> {
    if (this.cache && !options?.skipCache) {
      const cached = this.cache.get<T>(path);
      if (cached !== undefined) return cached;
    }

    const data = await this.fetcher.get<T>(path, options?.signal);

    if (this.cache && !options?.skipCache) {
      this.cache.set(path, data);
    }

    return data;
  }
}
