import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["src/**/*.integration.test.ts"],
    testTimeout: 10000,
    fileParallelism: false,
    env: {
      JWT_SECRET: "semaforo-dev-secret",
      CORS_ORIGIN: "http://localhost:5173",
      ENCRYPTION_KEY: "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
      SDK_JWT_SECRET: "test-sdk-secret",
    },
  },
});
