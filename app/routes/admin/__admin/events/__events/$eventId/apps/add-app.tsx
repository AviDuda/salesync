import { Outlet } from "@remix-run/react";
import type { PageHandle } from "~/types/remix";

export const handle: PageHandle = { breadcrumb: () => "Add app" };

export default function AddAppToEventOutlet() {
  return (
    <div>
      <h4>Add app</h4>
      <Outlet />
    </div>
  );
}
