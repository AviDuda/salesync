import { faker } from "@faker-js/faker";
import { expect, test } from "@playwright/test";

import {
  createUser,
  deleteUser,
  TEST_USER_PASSWORD,
  TEST_USER_SUFFIX,
} from "playwright/utils/user";
import { UserRole } from "~/prisma-client";

test.describe("login flow", () => {
  const email = `${faker.internet.userName()}${TEST_USER_SUFFIX}`;

  test.afterEach(async () => {
    await deleteUser(email);
  });

  test("should be able to log in with a new account", async ({ page }) => {
    await createUser(email, UserRole.Admin);

    await page.goto("/");
    expect(await page.title()).toBe("Sales Tool");
    await page.getByRole("link", { name: /log in/i }).click();
    await page.getByRole("textbox", { name: /email/i }).fill(email);
    await page
      .getByRole("textbox", { name: /password/i })
      .fill(TEST_USER_PASSWORD);
    await page.getByRole("button", { name: "Log in" }).click();
    await page.waitForURL("/admin", { timeout: 5000 });
    await page.waitForSelector("text=Admin Dashboard");
    expect(new URL(page.url()).pathname).toBe("/admin");
    await page.getByRole("button", { name: /logout/i }).click();
    await page.waitForSelector("text=Log In");
  });
});
