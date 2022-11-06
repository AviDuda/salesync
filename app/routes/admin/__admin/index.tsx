import type { LoaderArgs } from "@remix-run/server-runtime";
import { requireUserId } from "~/session.server";
import type { PageHandle } from "~/types/remix";

export async function loader({ request }: LoaderArgs) {
  await requireUserId(request);
  return null;
}

export const handle: PageHandle = { title: () => "Dashboard" };

export default function AdminDashboard() {
  return (
    <div>
      <h2>Admin dashboard</h2>
      <p>Nothing here yet, use the sidebar</p>
    </div>
  );
}
