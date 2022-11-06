import { Outlet } from "@remix-run/react";
import type { PageHandle } from "~/types/remix";

export const handle: PageHandle = { breadcrumb: () => "Events" };

export default function EventsOutlet() {
  return <Outlet />;
}
