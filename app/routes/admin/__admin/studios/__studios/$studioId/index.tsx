import { Link, useParams } from "@remix-run/react";
import type { LoaderArgs } from "@remix-run/server-runtime";
import invariant from "tiny-invariant";
import { requireUserId } from "~/session.server";

export async function loader({ request, params }: LoaderArgs) {
  await requireUserId(request);
  invariant(params.studioId, "Invalid studio ID");
  return null;
}

export default function StudioIndex() {
  const { studioId } = useParams();
  invariant(studioId);

  return (
    <ul>
      <li>
        <Link to="edit">Edit studio</Link>
      </li>
      <li>
        <Link to={`/admin/apps/new?studioId=${studioId}`}>Add new app</Link>
      </li>
      <li>
        <Link to="add-member">Add member</Link>
      </li>
    </ul>
  );
}
