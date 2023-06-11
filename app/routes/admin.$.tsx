import type { LoaderArgs } from "@remix-run/server-runtime";

import { requireAdminUser } from "~/session.server";

export async function loader({ request }: LoaderArgs) {
  await requireAdminUser(request);
  return null;
}
export default function NotFound() {
  return <h2>404 Not Found</h2>;
}
