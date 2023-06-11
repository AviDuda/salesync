import { Outlet } from "@remix-run/react";

import type { PageHandle } from "~/types/remix";

export const handle: PageHandle = { breadcrumb: () => "Users" };

export default function UsersOutlet() {
  return <Outlet />;
}
