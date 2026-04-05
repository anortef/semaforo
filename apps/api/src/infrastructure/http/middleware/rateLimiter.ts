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

export function createPublicLimiter(maxRequests = 100, windowMs = 60 * 1000) {
  return rateLimit({
    windowMs,
    max: maxRequests,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Too many requests, please try again later" },
  });
}
