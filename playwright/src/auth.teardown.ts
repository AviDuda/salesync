import { test as teardown } from "@playwright/test";

import { prisma } from "~/database.server";

teardown.afterAll(async () => {
  await prisma.user.deleteMany({
    where: {
      email: {
        endsWith: "-e2e@example.com",
      },
    },
  });
});
