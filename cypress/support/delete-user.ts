// Use this to delete a user by their email
// Simply call this with:
// pnpm exec ts-node --require tsconfig-paths/register ./cypress/support/delete-user.ts username@example.com
// and that user will get deleted

import { PrismaClientKnownRequestError } from "@prisma/client/runtime";
import { installGlobals } from "@remix-run/node";

import { prisma } from "~/database.server";

installGlobals();

async function deleteUser(email: string) {
  if (!email) {
    throw new Error("email required for login");
  }
  if (!email.endsWith("@example.com")) {
    throw new Error("All test emails must end in @example.com");
  }

  try {
    await prisma.user.delete({ where: { email } });
  } catch (error) {
    if (
      error instanceof PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      console.log("User not found, so no need to delete");
    } else {
      throw error;
    }
  } finally {
    await prisma.$disconnect();
  }
}

// eslint-disable-next-line unicorn/prefer-top-level-await -- this is a script
deleteUser(process.argv[2]);
