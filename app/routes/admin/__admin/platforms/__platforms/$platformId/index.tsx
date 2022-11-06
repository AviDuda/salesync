import { Link } from "@remix-run/react";
import type { LoaderArgs } from "@remix-run/server-runtime";
import invariant from "tiny-invariant";
import { requireUserId } from "~/session.server";

export async function loader({ request, params }: LoaderArgs) {
  await requireUserId(request);
  invariant(params.platformId, "Invalid platform ID");
  return null;
}

export default function PlatformIndex() {
  return (
    <div>
      <p>
        <Link to="edit">Edit platform</Link>
      </p>
    </div>
  );
}