/// <reference types="vitest" />
/// <reference types="vite/client" />

/* eslint-disable import/no-extraneous-dependencies -- testing is in dev only */
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";
/* eslint-enable import/no-extraneous-dependencies */

export default defineConfig({
  plugins: [react(), tsconfigPaths()],
  test: {
    globals: true,
    environment: "happy-dom",
    setupFiles: ["./test/setup-test-environment.ts"],
    include: ["./app/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}"],
    watchExclude: [
      ".*\\/node_modules\\/.*",
      ".*\\/build\\/.*",
      ".*\\/postgres-data\\/.*",
    ],
  },
});
