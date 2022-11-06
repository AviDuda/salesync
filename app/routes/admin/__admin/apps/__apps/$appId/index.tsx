import { Link } from "@remix-run/react";
import type { LoaderArgs } from "@remix-run/server-runtime";
import invariant from "tiny-invariant";
import { requireUserId } from "~/session.server";

export async function loader({ request, params }: LoaderArgs) {
  await requireUserId(request);
  invariant(params.appId, "Invalid app ID");
  return null;
}

export default function AppIndex() {
  return (
    <div>
      <p>
        <Link to="edit">Edit app</Link>
      </p>
      <p>
        <Link to="new-platform">Add platform</Link>
      </p>
    </div>
  );
}
