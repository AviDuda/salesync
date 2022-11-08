import { Link } from "@remix-run/react";
import type { LoaderArgs } from "@remix-run/server-runtime";
import { requireAdminUser } from "~/session.server";

export async function loader({ request }: LoaderArgs) {
  await requireAdminUser(request);
  return null;
}

export default function EventAppAdminIndex() {
  return (
    <p>
      <Link to="add-apps">Add apps</Link>
    </p>
  );
}
