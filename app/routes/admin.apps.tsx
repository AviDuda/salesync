import { Outlet } from "@remix-run/react";

import type { PageHandle } from "~/types/remix";

export const handle: PageHandle = { breadcrumb: () => "Apps" };

export default function AppsOutlet() {
  return <Outlet />;
}
