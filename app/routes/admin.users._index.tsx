import { Link, useLoaderData } from "@remix-run/react";
import type { LoaderArgs } from "@remix-run/server-runtime";
import { json } from "@remix-run/server-runtime";

import { prisma } from "~/database.server";
import { requireAdminUser } from "~/session.server";

export async function loader({ request }: LoaderArgs) {
  await requireAdminUser(request);
  const users = await prisma.user.findMany({
    include: {
      coordinatorForEvents: { include: { event: { select: { name: true } } } },
      studios: { include: { studio: { select: { name: true } } } },
    },
    orderBy: { name: "asc" },
  });
  return json({ users });
}

export default function Users() {
  const data = useLoaderData<typeof loader>();

  function renderEventList(user: (typeof data)["users"][number]) {
    return user.coordinatorForEvents.map((coordinator) => (
      <p key={coordinator.eventId}>
        <Link to={`/admin/events/${coordinator.eventId}`}>
          {coordinator.event.name}
        </Link>
      </p>
    ));
  }

  function renderStudioList(user: (typeof data)["users"][number]) {
    return user.studios.map((studio) => (
      <p key={studio.id}>
        <Link to={`/admin/studios/${studio.studioId}`}>
          {studio.studio.name}
        </Link>
      </p>
    ));
  }

  return (
    <div>
      <h2>Users</h2>
      <p>
        <Link to="new">New user</Link>
      </p>
      <table className="w-full table-auto">
        <thead>
          <tr>
            <th className="text-left">Name</th>
            <th className="text-left">Email</th>
            <th className="text-left">Role</th>
            <th className="text-left">Coordinator for</th>
            <th className="text-left">Studios</th>
          </tr>
        </thead>
        <tbody>
          {data.users.map((user) => (
            <tr key={user.id}>
              <td>
                <Link to={user.id}>{user.name}</Link>
              </td>
              <td>{user.email}</td>
              <td>{user.role}</td>
              <td>
                {user.coordinatorForEvents.length === 1 &&
                  renderEventList(user)}
                {user.coordinatorForEvents.length > 1 && (
                  <details>
                    <summary>{user.coordinatorForEvents.length} events</summary>
                    {renderEventList(user)}
                  </details>
                )}
              </td>
              <td>
                {user.studios.length === 1 && renderStudioList(user)}
                {user.studios.length > 1 && (
                  <details>
                    <summary>{user.studios.length} studios</summary>
                    {renderStudioList(user)}
                  </details>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
