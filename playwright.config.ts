/**
 * Base config for Playwright (E2E testing library)
 *
 * Extend it in each app's `playwright.config.ts`
 *
 * @see https://playwright.dev/docs/test-configuration
 */

/* eslint-disable unicorn/prefer-module -- Node script */
/* eslint-disable @typescript-eslint/no-magic-numbers -- constants */

import path from "node:path";

import type { PlaywrightTestConfig } from "@playwright/test";
// eslint-disable-next-line import/no-extraneous-dependencies -- tests should run in dev
import { devices } from "@playwright/test";

const basePort = process.env.PORT ?? 3000;
const baseURL = process.env.E2E_BASE_URL || `http://localhost:${basePort}`;

const playwrightResults = path.join(__dirname, "playwright-results");

const config: PlaywrightTestConfig = {
  testDir: path.join(__dirname, "playwright", "src"),
  testMatch: /.*\.e2e\.ts/,
  /* Output directory for test results, relative to the app */
  outputDir: path.join(playwrightResults, "test-results"),
  snapshotDir: path.join(playwrightResults, "snapshots"),
  /* Maximum time one test can run for */
  timeout: 30 * 1000,
  expect: {
    /**
     * Maximum time expect() should wait for the condition to be met.
     * For example in `await expect(locator).toHaveText();`
     */
    timeout: 5000,
  },
  /* Run tests in files in parallel */
  fullyParallel: true,
  /* Fail the build on CI if you accidentally left test.only in the source code */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,
  /* Opt out of parallel tests on CI */
  workers: process.env.CI ? 1 : undefined,
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: [
    ["html", { outputFolder: path.join(playwrightResults, "reporter-html") }],
  ],
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions */
  use: {
    /* Maximum time each action such as `click()` can take. Defaults to 0 (no limit). */
    actionTimeout: 0,
    /* Base URL to use in actions like `await page.goto('/')` */
    baseURL,
    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: "on-first-retry",
    /* Take screenshots when something goes wrong */
    screenshot: "only-on-failure",
    /* Keep videos when something goes wrong */
    video: "retain-on-failure",
  },
  webServer: {
    command: "pnpm exec run-s build start",
    url: baseURL,
    reuseExistingServer: !process.env.CI,
  },

  /* Configure projects for major browsers */
  projects: [
    { name: "setup", testMatch: /.*\.setup\.ts/, teardown: "teardown" },
    { name: "teardown", testMatch: /.*\.teardown\.ts/ },

    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
      },
    },

    {
      name: "firefox",
      use: {
        ...devices["Desktop Firefox"],
      },
    },
  ],
};

export default config;

/* eslint-enable @typescript-eslint/no-magic-numbers */
/* eslint-enable unicorn/prefer-module */
