import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.{ts,tsx}"],
    // The database tests start a real (in-memory) Postgres; give them room.
    testTimeout: 30_000,
  },
  // Compile JSX the way Next does, so components render in tests without
  // importing React themselves.
  esbuild: { jsx: "automatic" },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
});
