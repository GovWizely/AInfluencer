import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: { "@": import.meta.dirname },
  },
  test: {
    projects: [
      {
        extends: true,
        test: {
          name: "unit",
          include: ["**/*.unit.test.ts"],
          exclude: ["node_modules/**"],
        },
      },
      {
        extends: true,
        test: {
          name: "integration",
          include: ["**/*.integration.test.ts"],
          exclude: ["node_modules/**"],
          testTimeout: 20_000,
        },
      },
    ],
  },
});
