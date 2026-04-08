import type { Fetcher } from "./fetcher.js";
import type { TtlCache } from "./cache.js";
import type { PollingUpdateEvent } from "./types.js";
import type { SemaforoError } from "./errors.js";

export interface Poller {
  start(): void;
  stop(): void;
  readonly isRunning: boolean;
}

export function createPoller(options: {
  fetcher: Fetcher;
  cache: TtlCache | null;
  intervalMs: number;
  resources: Array<"toggles" | "values">;
  onUpdate?: (event: PollingUpdateEvent) => void;
  onError?: (error: SemaforoError) => void;
}): Poller {
  let timer: ReturnType<typeof setInterval> | null = null;
  const previous = new Map<string, string>();

  async function poll() {
    for (const resource of options.resources) {
      const path = `/${resource}`;
      try {
        const data = await options.fetcher.get<Record<string, boolean> | Record<string, string>>(path);
        options.cache?.set(path, data);

        const serialized = JSON.stringify(data);
        const prev = previous.get(resource);
        if (prev !== undefined && prev !== serialized) {
          options.onUpdate?.({
            resource,
            data,
            previous: JSON.parse(prev) as Record<string, boolean> | Record<string, string>,
          });
        }
        previous.set(resource, serialized);
      } catch (err) {
        options.onError?.(err as SemaforoError);
      }
    }
  }

  return {
    start() {
      if (timer) return;
      poll();
      timer = setInterval(poll, options.intervalMs);
    },
    stop() {
      if (timer) {
        clearInterval(timer);
        timer = null;
      }
    },
    get isRunning() {
      return timer !== null;
    },
  };
}
