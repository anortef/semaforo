import {
  SemaforoError,
  UnauthorizedError,
  NotFoundError,
  RateLimitError,
  ServerError,
} from "./errors.js";

export interface Fetcher {
  get<T>(path: string, signal?: AbortSignal): Promise<T>;
}

export function createFetcher(options: {
  baseUrl: string;
  apiKey: string;
  fetch: typeof globalThis.fetch;
}): Fetcher {
  const base = options.baseUrl.replace(/\/+$/, "");

  return {
    async get<T>(path: string, signal?: AbortSignal): Promise<T> {
      const url = `${base}/api/public${path}`;

      let res: Response;
      try {
        res = await options.fetch(url, {
          method: "GET",
          headers: { "x-api-key": options.apiKey },
          signal,
        });
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") throw err;
        const msg = err instanceof Error ? err.message : "Network error";
        throw new SemaforoError(msg, 0);
      }

      if (res.ok) {
        return (await res.json()) as T;
      }

      const body = await res.json().catch(() => ({}));
      const message = (body as { error?: string }).error ?? res.statusText;

      switch (res.status) {
        case 401:
          throw new UnauthorizedError(message);
        case 404:
          throw new NotFoundError(message);
        case 429: {
          const retryAfter = res.headers.get("retry-after");
          const retryMs = retryAfter ? parseInt(retryAfter, 10) * 1000 : undefined;
          throw new RateLimitError(message, retryMs && !isNaN(retryMs) ? retryMs : undefined);
        }
        default:
          if (res.status >= 500) throw new ServerError(message);
          throw new SemaforoError(message, res.status, body);
      }
    },
  };
}
