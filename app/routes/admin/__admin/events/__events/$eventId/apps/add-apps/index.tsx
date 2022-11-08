import { Form, Link, useLoaderData } from "@remix-run/react";
import type { LoaderArgs } from "@remix-run/server-runtime";
import { json } from "@remix-run/server-runtime";
import { parse } from "qs";
import invariant from "tiny-invariant";
import { z } from "zod";
import { prisma } from "~/db.server";
import type { App, AppPlatform } from "~/prisma-client";
import { requireAdminUser } from "~/session.server";
import { getApps } from "../../apps";
import { Intent } from "./select-platforms";

export enum GroupBy {
  None = "none",
  Platform = "platform",
  Studio = "studio",
}

const searchParamsSchema = z
  .object({
    groupBy: z.nativeEnum(GroupBy),
  })
  .partial();

export async function loader({ request, params }: LoaderArgs) {
  await requireAdminUser(request);
  invariant(params.eventId, "Invalid event ID");

  const { searchParams } = new URL(request.url);
  const parsedSearchParams = searchParamsSchema.safeParse(
    parse(searchParams.toString())
  );

  let groupBy: GroupBy;
  if (parsedSearchParams.success) {
    groupBy = parsedSearchParams.data.groupBy ?? GroupBy.None;
  } else {
    groupBy = GroupBy.None;
  }

  const { appsMap } = await getApps(params.eventId);
  const currentAppPlatforms = [...appsMap.values()].flatMap((appData) =>
    appData.appPlatforms.map((appPlatform) => appPlatform.id)
  );

  const apps = (
    await prisma.app.findMany({
      where: { appPlatforms: { some: { id: { notIn: currentAppPlatforms } } } },
      select: {
        id: true,
        name: true,
        studioId: true,
        appPlatforms: { select: { id: true, platformId: true } },
      },
      orderBy: { name: "asc" },
    })
  ).filter((app) => app.appPlatforms.length > 0);

  let groupedApps: Array<{
    group: { id: string; name: string };
    apps: Array<{
      id: App["id"];
      name: App["name"];
      /** Set only when group is set to platform */
      appPlatformId?: AppPlatform["id"];
    }>;
  }> = [];

  switch (groupBy) {
    case GroupBy.None: {
      groupedApps = [{ group: { id: "default", name: "" }, apps }];
      break;
    }

    case GroupBy.Studio: {
      const studios = await prisma.studio.findMany({
        where: {
          id: { in: [...new Set(apps.map((app) => app.studioId))] },
        },
        select: { id: true, name: true },
        orderBy: { name: "asc" },
      });
      groupedApps = studios.map((studio) => {
        return {
          group: { id: studio.id, name: studio.name },
          apps: apps.filter((app) => app.studioId === studio.id),
        };
      });
      break;
    }

    case GroupBy.Platform: {
      const platforms = await prisma.platform.findMany({
        where: {
          id: {
            in: [
              ...new Set(
                apps.flatMap((app) =>
                  app.appPlatforms.map((appPlatform) => appPlatform.platformId)
                )
              ),
            ],
          },
        },
        select: { id: true, name: true },
      });
      groupedApps = platforms.map((platform) => {
        return {
          group: { id: platform.id, name: platform.name },
          apps: apps
            .map((app) => {
              const appPlatform = app.appPlatforms.find(
                (appPlatform) => appPlatform.platformId === platform.id
              );
              if (!appPlatform) return null;
              return {
                id: app.id,
                name: app.name,
                appPlatformId: appPlatform.id,
              };
            })
            .filter((app): app is never => app !== null),
        };
      });
      break;
    }
  }

  return json({ groupBy, groupedApps });
}

export default function AddAppsToEvent() {
  const data = useLoaderData<typeof loader>();

  return (
    <div>
      <ul>
        <li>
          <Link to=".">Alphabetical app list</Link>
        </li>
        <li>
          <Link to="?groupBy=studio">App list by studio</Link>
        </li>
        <li>
          <Link to="?groupBy=platform">App list by platform</Link>
        </li>
      </ul>
      <Form
        method="post"
        action="select-platforms"
        className="flex flex-col gap-2 w-fit"
      >
        <input type="hidden" name="groupBy" value={data.groupBy} />
        <div className="flex flex-col gap-2">
          <label htmlFor="appData">Apps</label>
          <select name="appData" id="appData" multiple className="h-96">
            {data.groupedApps.map((appGroup) => (
              <optgroup
                key={appGroup.group.id}
                label={appGroup.group.name}
                onClick={(ev) => {
                  // Select all options inside the optgroup
                  if (ev.target !== ev.currentTarget) return;
                  (
                    [...ev.currentTarget.children] as HTMLOptionElement[]
                  ).forEach((child) => {
                    child.selected = true;
                  });
                }}
              >
                {appGroup.apps.map((app) => (
                  <option
                    key={app.id}
                    value={JSON.stringify({
                      appId: app.id,
                      appPlatformId: app.appPlatformId,
                    })}
                  >
                    {app.name}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </div>
        <button
          type="submit"
          name="intent"
          value={Intent.SetAppData}
          className="button-primary"
        >
          Continue
        </button>
      </Form>
    </div>
  );
}
