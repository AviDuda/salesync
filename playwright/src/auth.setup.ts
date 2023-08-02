import type { Page } from "@playwright/test";
import { test as setup } from "@playwright/test";

import {
  createUser,
  TEST_USER_PASSWORD,
  TEST_USER_SUFFIX,
} from "../utils/user";

import { getUserByEmail } from "~/models/user.server";
import { UserRole } from "~/prisma-client";

/**
 * The storage state files are used to persist the user's session between tests.
 *
 * Use them in tests like this:
 *
 * ```ts
 * import { test } from "@playwright/test";
 *
 * // You can use storageState for the whole test file:
 * // test.use({ storageState: authStorage.developer });
 *
 * test("example", async ({ page }) => {
 *  // Or you can use storageState for a single test:
 *  test.use({ storageState: authStorage.developer });
 *  // Rest of the test
 * });
 * ```
 */
export const authStorage = {
  developer: "playwright/.auth/developer.json",
  admin: "playwright/.auth/admin.json",
} as const;

async function authAsUser(
  email: string,
  role: UserRole,
  storageFile: string,
  page: Page
) {
  // Check if the user exists. If not, create it.
  const user = await getUserByEmail(email);
  if (!user) {
    await createUser(email, role);
  }

  // Perform authentication steps
  await page.goto("/login");
  await page.getByRole("textbox", { name: /email/i }).fill(email);
  await page
    .getByRole("textbox", { name: /password/i })
    .fill(TEST_USER_PASSWORD);
  await page.getByRole("button", { name: /log in/i }).click();

  await page.waitForURL("/admin", { timeout: 5000 });

  await page.context().storageState({ path: storageFile });
}

setup("authenticate as admin", async ({ page }) => {
  await authAsUser(
    `admin-${TEST_USER_SUFFIX}`,
    UserRole.Admin,
    authStorage.admin,
    page
  );
});

setup("authenticate as developer", async ({ page }) => {
  await authAsUser(
    `dev-${TEST_USER_SUFFIX}`,
    UserRole.Developer,
    authStorage.developer,
    page
  );
});
