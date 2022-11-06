import { Link } from "@remix-run/react";
import type { LoaderArgs } from "@remix-run/server-runtime";
import { typedjson, useTypedLoaderData } from "remix-typedjson";
import type { UseDataFunctionReturn } from "remix-typedjson/dist/remix";
import invariant from "tiny-invariant";
import { prisma } from "~/db.server";
import { requireUserId } from "~/session.server";
import type { PageHandle } from "~/types/remix";

export async function loader({ request, params }: LoaderArgs) {
  await requireUserId(request);
  invariant(params.eventId, "Invalid event ID");
  invariant(params.platformId, "Invalid platform ID");

  const platform = await prisma.platform.findFirstOrThrow({
    where: { id: params.platformId },
    select: { id: true, name: true },
  });

  const eventAppPlatforms = await prisma.eventAppPlatform.findMany({
    where: {
      AND: {
        eventId: params.eventId,
        appPlatform: { platformId: { equals: params.platformId } },
      },
    },
    include: {
      appPlatform: {
        include: {
          app: {
            select: {
              id: true,
              name: true,
              studio: { select: { id: true, name: true } },
            },
          },
        },
      },
    },
    orderBy: { appPlatform: { app: { name: "asc" } } },
  });

  return typedjson({ platform, eventAppPlatforms });
}

type Loader = UseDataFunctionReturn<typeof loader>;

export const handle: PageHandle = {
  breadcrumb: ({ data }) => `Platform ${(data as Loader).platform.name}`,
};

export default function EventPlatform() {
  const data = useTypedLoaderData<typeof loader>();
  return (
    <div>
      <h3>
        Event apps for platform{" "}
        <Link to={`/admin/platforms/${data.platform.id}`}>
          {data.platform.name}
        </Link>
      </h3>
      <p>This platform has {data.eventAppPlatforms.length} apps.</p>
      <table className="table-auto w-full">
        <thead>
          <tr>
            <th>App</th>
            <th>Studio</th>
            <th>Event status for platform</th>
            <th>Platform release state</th>
            <th className="text-center">Free to play</th>
          </tr>
        </thead>
        <tbody>
          {data.eventAppPlatforms.map((eventAppPlatform) => (
            <tr key={eventAppPlatform.id}>
              <td>
                <Link to={`/admin/apps/${eventAppPlatform.appPlatform.appId}`}>
                  {eventAppPlatform.appPlatform.app.name}
                </Link>
              </td>
              <td>
                <Link
                  to={`/admin/studios/${eventAppPlatform.appPlatform.app.studio.id}`}
                >
                  {eventAppPlatform.appPlatform.app.studio.name}
                </Link>
              </td>
              <td>{eventAppPlatform.status}</td>
              <td>{eventAppPlatform.appPlatform.releaseState}</td>
              <td className="text-center">
                <input
                  type="checkbox"
                  disabled
                  defaultChecked={eventAppPlatform.appPlatform.isFreeToPlay}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
