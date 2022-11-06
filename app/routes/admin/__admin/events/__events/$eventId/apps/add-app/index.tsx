import { Form, useLoaderData } from "@remix-run/react";
import type { ActionArgs, LoaderArgs } from "@remix-run/server-runtime";
import { json } from "@remix-run/server-runtime";
import invariant from "tiny-invariant";
import EmptyOption from "~/components/EmptyOption";
import { prisma } from "~/db.server";
import { requireAdminUser } from "~/session.server";
import { getApps } from "../../apps";

export async function action({ request, params }: ActionArgs) {
  await requireAdminUser(request);
  invariant(params.eventId, "Invalid event ID");
}

export async function loader({ request, params }: LoaderArgs) {
  await requireAdminUser(request);
  invariant(params.eventId, "Invalid event ID");

  const { appsMap } = await getApps(params.eventId);
  const currentAppIds = [...appsMap.keys()];

  const apps = await prisma.app.findMany({
    where: { id: { notIn: currentAppIds } },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  return json({ apps });
}

export default function AddAppToEvent() {
  const data = useLoaderData<typeof loader>();

  return (
    <div>
      {data.apps.length === 0 ? (
        <p>This event already includes all apps in the database!</p>
      ) : (
        <Form
          method="get"
          action="select-platforms"
          className="flex flex-col gap-2 w-fit"
        >
          <div className="flex flex-col gap-2">
            <label htmlFor="appId">App</label>
            <select name="appId" id="appId" defaultValue="">
              <EmptyOption />
              {data.apps.map((app) => (
                <option key={app.id} value={app.id}>
                  {app.name}
                </option>
              ))}
            </select>
          </div>
          <input type="submit" value="Continue" className="button-primary" />
        </Form>
      )}
    </div>
  );
}
