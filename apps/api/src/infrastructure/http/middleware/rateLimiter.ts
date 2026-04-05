import rateLimit from "express-rate-limit";

export function createLoginLimiter(maxAttempts = 10, windowMs = 15 * 60 * 1000) {
  return rateLimit({
    windowMs,
    max: maxAttempts,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Too many requests, please try again later" },
  });
}

// Generous limit for all public requests (cache hits are cheap)
export function createPublicLimiter(maxRequests = 100_000, windowMs = 60 * 1000) {
  return rateLimit({
    windowMs,
    max: maxRequests,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Too many requests, please try again later" },
  });
}

// Strict limit applied only on cache misses (protects DB)
export function createCacheMissLimiter(maxRequests = 100, windowMs = 60 * 1000) {
  return rateLimit({
    windowMs,
    max: maxRequests,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Too many requests, please try again later" },
  });
}
