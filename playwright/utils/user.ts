import { prisma } from "~/database.server";
import { environment } from "~/environment.server";
import {
  deleteUserByEmail,
  createUser as modelCreateUser,
} from "~/models/user.server";
import type { UserRole } from "~/prisma-client";
import { PrismaClientKnownRequestError } from "~/prisma-client/runtime";

export const TEST_USER_SUFFIX = "-e2e@example.com";
export const TEST_USER_PASSWORD = environment.E2E_USER_PASSWORD ?? "hunter2";
if (!environment.E2E_USER_PASSWORD) {
  console.warn("E2E_USER_PASSWORD is not set. Using the default password.");
}

export async function createUser(email: string, role: string) {
  if (!email) {
    throw new Error("email required for login");
  }
  if (!email.endsWith(TEST_USER_SUFFIX)) {
    throw new Error(`All test emails must end in ${TEST_USER_SUFFIX}`);
  }

  const user = await modelCreateUser(
    { email, name: "Test User", role: role as UserRole },
    TEST_USER_PASSWORD
  );

  return user;
}

export async function deleteUser(email: string) {
  if (!email) {
    throw new Error("email required for login");
  }
  if (!email.endsWith("@example.com")) {
    throw new Error("All test emails must end in @example.com");
  }

  try {
    await deleteUserByEmail(email);
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
