import { Outlet } from "@remix-run/react";
import type { PageHandle } from "~/types/remix";

export const handle: PageHandle = { breadcrumb: () => "Add apps" };

export default function AddAppsToEventOutlet() {
  return (
    <div>
      <h4>Add apps</h4>
      <Outlet />
    </div>
  );
}
