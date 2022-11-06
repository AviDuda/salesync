import { Outlet } from "@remix-run/react";
import type { PageHandle } from "~/types/remix";

export const handle: PageHandle = { breadcrumb: () => "Studios" };

export default function StudiosOutlet() {
  return <Outlet />;
}
