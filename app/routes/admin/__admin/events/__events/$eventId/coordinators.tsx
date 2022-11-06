import { Form, Link, Outlet, useLoaderData } from "@remix-run/react";
import type { ActionArgs, LoaderArgs } from "@remix-run/server-runtime";
import { json } from "@remix-run/server-runtime";
import invariant from "tiny-invariant";
import { zfd } from "zod-form-data";
import { prisma } from "~/db.server";
import { requireUserId } from "~/session.server";
import type { PageHandle } from "~/types/remix";

export async function action({ request, params }: ActionArgs) {
  await requireUserId(request);
  invariant(params.eventId, "Invalid event ID");

  const schema = zfd.formData({
    userId: zfd.text(),
  });

  const data = schema.parse(await request.formData());

  await prisma.eventCoordinator.delete({
    where: { userId_eventId: { eventId: params.eventId, userId: data.userId } },
  });

  return null;
}

export async function loader({ request, params }: LoaderArgs) {
  await requireUserId(request);
  invariant(params.eventId, "Invalid event ID");
  const coordinators = await prisma.eventCoordinator.findMany({
    where: { eventId: params.eventId },
    select: { user: { select: { id: true, name: true, email: true } } },
  });

  return json({ coordinators });
}

export const handle: PageHandle = { breadcrumb: () => "Event coordinators" };

export default function EventCoordinators() {
  const data = useLoaderData<typeof loader>();

  return (
    <div>
      <h3>Event coordinators</h3>
      <Outlet />
      <h4>List</h4>
      <table className="table-auto w-full">
        <thead>
          <tr>
            <th>Name</th>
            <th>Email</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {data.coordinators.map((coordinator) => (
            <tr key={coordinator.user.id}>
              <td>
                <Link to={`/admin/users/${coordinator.user.id}`}>
                  {coordinator.user.name}
                </Link>
              </td>
              <td>
                <Link to={`mailto:${coordinator.user.email}`}>
                  {coordinator.user.email}
                </Link>
              </td>
              <td>
                <Form method="post">
                  <input
                    type="hidden"
                    name="userId"
                    value={coordinator.user.id}
                  />
                  <button type="submit" className="button-destructive">
                    X
                  </button>
                </Form>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
