import { describe, it, expect } from "vitest";
import {
  SemaforoError,
  UnauthorizedError,
  NotFoundError,
  RateLimitError,
  ServerError,
} from "../errors.js";

describe("SemaforoError", () => {
  it("stores status code and message", () => {
    const err = new SemaforoError("something broke", 418);
    expect(err.message).toBe("something broke");
    expect(err.statusCode).toBe(418);
    expect(err.name).toBe("SemaforoError");
    expect(err).toBeInstanceOf(Error);
  });

  it("stores optional response body", () => {
    const body = { error: "detail" };
    const err = new SemaforoError("fail", 400, body);
    expect(err.responseBody).toBe(body);
  });
});

describe("UnauthorizedError", () => {
  it("defaults to 401 with message", () => {
    const err = new UnauthorizedError();
    expect(err.statusCode).toBe(401);
    expect(err.name).toBe("UnauthorizedError");
    expect(err).toBeInstanceOf(SemaforoError);
  });

  it("accepts custom message", () => {
    const err = new UnauthorizedError("bad key");
    expect(err.message).toBe("bad key");
  });
});

describe("NotFoundError", () => {
  it("defaults to 404", () => {
    const err = new NotFoundError();
    expect(err.statusCode).toBe(404);
    expect(err.name).toBe("NotFoundError");
    expect(err).toBeInstanceOf(SemaforoError);
  });
});

describe("RateLimitError", () => {
  it("defaults to 429", () => {
    const err = new RateLimitError();
    expect(err.statusCode).toBe(429);
    expect(err.name).toBe("RateLimitError");
    expect(err.retryAfterMs).toBeUndefined();
  });

  it("stores retryAfterMs", () => {
    const err = new RateLimitError("slow down", 5000);
    expect(err.retryAfterMs).toBe(5000);
  });
});

describe("ServerError", () => {
  it("defaults to 500", () => {
    const err = new ServerError();
    expect(err.statusCode).toBe(500);
    expect(err.name).toBe("ServerError");
    expect(err).toBeInstanceOf(SemaforoError);
  });
});
