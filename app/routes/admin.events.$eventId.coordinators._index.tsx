import { Link } from "@remix-run/react";
import type { LoaderArgs } from "@remix-run/server-runtime";
import invariant from "tiny-invariant";

import { requireAdminUser } from "~/session.server";

export async function loader({ request, params }: LoaderArgs) {
  await requireAdminUser(request);
  invariant(params.eventId, "Invalid event ID");
  return null;
}

export default function CoordinatorIndex() {
  return (
    <div>
      <p>
        <Link to="new">Add coordinator</Link>
      </p>
    </div>
  );
}
