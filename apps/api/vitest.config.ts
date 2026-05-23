import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["src/**/*.test.ts"],
    exclude: ["src/**/*.integration.test.ts"],
    env: {
      JWT_SECRET: "test-secret",
      CORS_ORIGIN: "http://localhost:5173",
      ENCRYPTION_KEY: "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
      SDK_JWT_SECRET: "test-sdk-secret",
    },
  },
});
