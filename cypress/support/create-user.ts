// Use this to create a new user WITHOUT signing in.
// Simply call this with:
// pnpm exec ts-node --require tsconfig-paths/register ./cypress/support/create-user.ts username@example.com
// and it will log out the cookie value you can use to interact with the server
// as that new user.

import { installGlobals } from "@remix-run/node";
import { typedjson } from "remix-typedjson";

import { createUser } from "~/models/user.server";
import type { UserRole } from "~/prisma-client";

installGlobals();

export async function create(email: string, role: string) {
  if (!email) {
    throw new Error("email required for login");
  }
  if (!email.endsWith("@example.com")) {
    throw new Error("All test emails must end in @example.com");
  }

  const user = await createUser(
    { email, name: "Test User", role: role as UserRole },
    "myreallystrongpassword"
  );

  // we log it like this so our cypress command can parse it out and set it as
  // the user value.
  console.log(
    `
<user>
${typedjson(user)}
</user>`.trim()
  );
  return user;
}

create(process.argv[2], process.argv[3]);
