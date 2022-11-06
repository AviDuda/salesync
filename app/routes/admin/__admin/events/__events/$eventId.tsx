import { Outlet, useLoaderData } from "@remix-run/react";
import type { LoaderArgs } from "@remix-run/server-runtime";
import { json } from "@remix-run/server-runtime";
import invariant from "tiny-invariant";
import { prisma } from "~/db.server";
import { requireUserId } from "~/session.server";
import type { PageHandle } from "~/types/remix";

export async function loader({ request, params }: LoaderArgs) {
  await requireUserId(request);
  invariant(params.eventId, "Invalid event ID");
  const event = await prisma.event.findUnique({
    where: { id: params.eventId },
    select: { name: true },
  });
  invariant(event, "Event not found");

  return json({ event });
}

export const handle: PageHandle = {
  breadcrumb: ({ data }) => data?.event?.name,
};

export default function Event() {
  const data = useLoaderData<typeof loader>();

  return (
    <div>
      <h2>{data.event.name}</h2>
      <Outlet />
    </div>
  );
}
