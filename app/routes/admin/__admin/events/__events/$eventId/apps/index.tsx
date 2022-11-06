import { Link } from "@remix-run/react";
import type { LoaderArgs } from "@remix-run/server-runtime";
import { requireUserId } from "~/session.server";

export async function loader({ request }: LoaderArgs) {
  await requireUserId(request);
  return null;
}

export default function EventAppAdminIndex() {
  return (
    <p>
      <Link to="add-app">Add app</Link>
    </p>
  );
}
