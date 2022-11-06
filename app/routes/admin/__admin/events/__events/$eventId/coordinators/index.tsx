import { Link } from "@remix-run/react";
import type { LoaderArgs } from "@remix-run/server-runtime";
import invariant from "tiny-invariant";
import { requireUserId } from "~/session.server";

export async function loader({ request, params }: LoaderArgs) {
  await requireUserId(request);
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
