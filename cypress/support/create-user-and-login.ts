// Use this to create a new user and login with that user
// Simply call this with:
// pnpm exec ts-node --require tsconfig-paths/register ./cypress/support/create-user=and-login.ts username@example.com
// and it will log out the cookie value you can use to interact with the server
// as that new user.

import { installGlobals } from "@remix-run/node";
// eslint-disable-next-line import/no-extraneous-dependencies -- tests should run in dev
import { parse } from "cookie";

import { create } from "./create-user";

import { createUserSession } from "~/session.server";

installGlobals();

async function createAndLogin(email: string, role: string) {
  const user = await create(email, role);

  const response = await createUserSession({
    request: new Request("test://test"),
    userId: user.id,
    remember: false,
    redirectTo: "/",
  });

  const cookieValue = response.headers.get("Set-Cookie");
  if (!cookieValue) {
    throw new Error("Cookie missing from createUserSession response");
  }
  const parsedCookie = parse(cookieValue);
  // we log it like this so our cypress command can parse it out and set it as
  // the cookie value.
  console.log(
    `
<cookie>
  ${parsedCookie.__session}
</cookie>
  `.trim()
  );
}

// eslint-disable-next-line unicorn/prefer-top-level-await -- this is a script
createAndLogin(process.argv[2], process.argv[3]);
