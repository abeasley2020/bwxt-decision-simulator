import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json-summary"],
      include: ["src/engine/**", "src/analytics/**", "src/lib/**", "src/content/**"],
      exclude: ["src/**/*.test.ts", "src/engine/types.ts"],
    },
  },
});
