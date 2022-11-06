import type { Event, Platform } from "~/prisma-client";
import type { LoaderArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { Link, useLoaderData } from "@remix-run/react";
import { omit } from "lodash";
import { prisma } from "~/db.server";
import { requireAdminUser } from "~/session.server";

export async function loader({ request }: LoaderArgs) {
  await requireAdminUser(request);
  const apps = (
    await prisma.app.findMany({
      include: {
        studio: { select: { name: true } },
        appPlatforms: {
          select: {
            platform: { select: { id: true, name: true } },
            eventAppPlatforms: {
              select: { id: true, event: { select: { id: true, name: true } } },
            },
          },
        },
      },
      orderBy: { name: "asc" },
    })
  ).map((app) => {
    let platforms = new Map<
      Platform["id"],
      { id: Platform["id"]; name: Platform["name"] }
    >();
    let events = new Map<
      Event["id"],
      { id: Event["id"]; name: Event["name"] }
    >();
    app.appPlatforms.forEach((appPlatform) => {
      const { id, name } = appPlatform.platform;
      platforms.set(appPlatform.platform.id, { id, name });
      appPlatform.eventAppPlatforms.forEach((eventAppPlatform) => {
        const { id, name } = eventAppPlatform.event;
        events.set(eventAppPlatform.event.id, { id, name });
      });
    });

    return {
      ...omit(app, "appPlatforms"),
      platforms: [...platforms.values()].sort((a, b) =>
        a.name.localeCompare(b.name)
      ),
      events: [...events.values()].sort((a, b) => a.name.localeCompare(b.name)),
    };
  });

  return json({ apps });
}

export default function Apps() {
  const { apps } = useLoaderData<typeof loader>();

  return (
    <div>
      <h2>Apps</h2>
      <Link to="new">New app</Link>
      <table className="table-auto w-full">
        <thead>
          <tr>
            <th>App</th>
            <th>Type</th>
            <th>Studio</th>
            <th>Events</th>
            <th>Platforms</th>
            <th>Comment</th>
          </tr>
        </thead>
        <tbody>
          {apps.map((app) => {
            return (
              <tr key={app.id}>
                <td>
                  <Link to={app.id}>{app.name}</Link>
                </td>
                <td>{app.type}</td>
                <td>
                  <Link to={`/admin/studios/${app.studioId}`}>
                    {app.studio.name}
                  </Link>
                </td>
                <td>
                  {app.events.length > 0 && (
                    <details>
                      <summary>{app.events.length} events</summary>
                      <ul>
                        {app.events.map((event) => (
                          <li key={event.id}>
                            <Link to={`/admin/events/${event.id}`}>
                              {event.name}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </details>
                  )}
                </td>
                <td>
                  {app.platforms.length > 0 && (
                    <details>
                      <summary>{app.platforms.length} platforms</summary>
                      <ul>
                        {app.platforms.map((platform) => (
                          <li key={platform.id}>
                            <Link to={`/admin/platforms/${platform.id}`}>
                              {platform.name}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </details>
                  )}
                </td>
                <td title={app.comment ?? undefined}>
                  {app.comment && "has comment"}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
