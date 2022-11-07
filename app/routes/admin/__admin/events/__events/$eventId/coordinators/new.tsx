import { Form, useLoaderData } from "@remix-run/react";
import type { ActionArgs, LoaderArgs } from "@remix-run/server-runtime";
import { json } from "@remix-run/server-runtime";
import { redirect } from "@remix-run/server-runtime";
import invariant from "tiny-invariant";
import { zfd } from "zod-form-data";
import EmptyOption from "~/components/EmptyOption";
import { prisma } from "~/db.server";
import { requireAdminUser } from "~/session.server";
import type { PageHandle } from "~/types/remix";

export async function action({ request, params }: ActionArgs) {
  await requireAdminUser(request);
  invariant(params.eventId, "Invalid event ID");

  const schema = zfd.formData({
    userId: zfd.text(),
  });

  const formData = await request.formData();
  const data = schema.parse(formData);

  await prisma.eventCoordinator.create({
    data: { eventId: params.eventId, userId: data.userId },
  });

  return redirect(`/admin/events/${params.eventId}/coordinators`);
}

export async function loader({ request, params }: LoaderArgs) {
  await requireAdminUser(request);
  invariant(params.eventId, "Invalid event ID");

  const users = await prisma.user.findMany({
    where: { coordinatorForEvents: { none: { eventId: params.eventId } } },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  return json({ users });
}

export const handle: PageHandle = { breadcrumb: () => "New coordinator" };

export default function NewCoordinator() {
  const data = useLoaderData<typeof loader>();

  return (
    <div>
      <h4>New coordinator</h4>
      <Form method="post" className="flex flex-col gap-4">
        <div className="grid grid-cols-[auto_auto] gap-4 w-fit">
          <label htmlFor="userId">User</label>
          <select name="userId" defaultValue="">
            <EmptyOption />
            {data.users.map((user) => (
              <option key={user.id} value={user.id}>
                {user.name}
              </option>
            ))}
          </select>
        </div>
        <div className="flex gap-2">
          <button type="submit" className="button-primary">
            Save
          </button>
        </div>
      </Form>
    </div>
  );
}
