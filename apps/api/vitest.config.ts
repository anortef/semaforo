import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["src/**/*.test.ts"],
    exclude: ["src/**/*.integration.test.ts"],
    env: {
      JWT_SECRET: "test-secret",
      CORS_ORIGIN: "http://localhost:5173",
    },
  },
});
