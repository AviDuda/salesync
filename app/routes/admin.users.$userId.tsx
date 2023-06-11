import { Link, Outlet, useLoaderData } from "@remix-run/react";
import type { LoaderArgs, SerializeFrom } from "@remix-run/server-runtime";
import { json } from "@remix-run/server-runtime";
import invariant from "tiny-invariant";

import { prisma } from "~/database.server";
import { requireAdminUser } from "~/session.server";
import type { PageHandle } from "~/types/remix";

export async function loader({ request, params }: LoaderArgs) {
  await requireAdminUser(request);
  invariant(params.userId, "Invalid user ID");
  const user = await prisma.user.findUnique({
    where: { id: params.userId },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      coordinatorForEvents: {
        select: { event: { select: { id: true, name: true } } },
      },
      studios: {
        select: {
          id: true,
          position: true,
          studio: { select: { id: true, name: true } },
        },
      },
    },
  });
  invariant(user, "User not found");

  return json({ user });
}

export type Loader = SerializeFrom<typeof loader>;

export const handle: PageHandle = {
  breadcrumb: ({ data }) => data?.user?.name,
};

export default function User() {
  const data = useLoaderData<typeof loader>();

  return (
    <div>
      <h2>{data.user.name}</h2>
      <div className="my-2">
        <Outlet />
      </div>
      <h3>User info</h3>
      <p>
        Email: <a href={`mailto:${data.user.email}`}>{data.user.email}</a>
      </p>
      <p>Role: {data.user.role}</p>
      {data.user.studios.length > 0 && (
        <div>
          <h3>Studios</h3>
          {data.user.studios.map((studio) => (
            <div key={studio.id}>
              <Link to={`/admin/studios/${studio.studio.id}`}>
                {studio.studio.name}
              </Link>
            </div>
          ))}
        </div>
      )}
      {data.user.coordinatorForEvents.length > 0 && (
        <div>
          <h3>Coordinator for events</h3>
          {data.user.coordinatorForEvents.map((coordinator) => (
            <div key={coordinator.event.id}>
              <Link to={`/admin/events/${coordinator.event.id}`}>
                {coordinator.event.name}
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
