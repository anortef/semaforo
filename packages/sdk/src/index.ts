export { SemaforoClient } from "./client.js";

export type {
  SemaforoClientOptions,
  CacheOptions,
  PollingOptions,
  PollingUpdateEvent,
  RequestOptions,
} from "./types.js";

export {
  SemaforoError,
  UnauthorizedError,
  NotFoundError,
  RateLimitError,
  ServerError,
} from "./errors.js";
