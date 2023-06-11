import { Outlet } from "@remix-run/react";

import type { PageHandle } from "~/types/remix";

export const handle: PageHandle = { breadcrumb: () => "Platforms" };

export default function PlatformsOutlet() {
  return <Outlet />;
}
