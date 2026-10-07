import { defineConfig } from "vitest/config";
import path from "node:path";
import fs from "node:fs";

if (fs.existsSync(".env")) process.loadEnvFile(".env");

export default defineConfig({
  resolve: { alias: { "@": path.resolve(__dirname) } },
  test: {
    globalSetup: ["./tests/preparar-base.ts"],
    setupFiles: ["./tests/entorno.ts"],
    fileParallelism: false,
    testTimeout: 20_000,
    hookTimeout: 60_000,
  },
});
