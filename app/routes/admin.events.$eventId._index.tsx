import { Link } from "@remix-run/react";
import type { LoaderArgs } from "@remix-run/server-runtime";
import { formatISO, formatRFC7231 } from "date-fns";
import { isEqual, sortBy, uniqWith } from "lodash";
import { Fragment } from "react";
import { typedjson, useTypedLoaderData } from "remix-typedjson";
import invariant from "tiny-invariant";

import { getApps } from "./admin.events.$eventId.apps._index";

import { prisma } from "~/database.server";
import { requireAdminUser } from "~/session.server";
import { jsxJoin } from "~/utils";

export async function loader({ request, params }: LoaderArgs) {
  await requireAdminUser(request);
  invariant(params.eventId, "Invalid event ID");

  const event = await prisma.event.findUnique({
    where: { id: params.eventId },
    include: {
      eventAppPlatforms: { select: { appPlatformId: true } },
      coordinators: { select: { user: { select: { id: true, name: true } } } },
    },
  });
  invariant(event, "Event not found");

  const { appsMap, platformsMap } = await getApps(params.eventId);
  const appData = [...appsMap.values()];
  const platforms = [...platformsMap.values()].map((platform) => {
    let appCount = 0;
    for (const app of appData) {
      const appPlatform = app.appPlatforms.find(
        (ap) => ap.platformId === platform.id
      );
      if (appPlatform) {
        appCount += 1;
      }
    }
    return {
      ...platform,
      appCount,
      studioCount: new Set(
        appData
          .map((app) => {
            const appPlatform = app.appPlatforms.find(
              (ap) => ap.platformId === platform.id
            );
            return appPlatform ? app.studioId : null;
          })
          .filter((studioId) => studioId !== null)
      ).size,
    };
  });

  // TODO This isn't optimal, we don't need the app list
  const apps = await prisma.app.findMany({
    where: {
      appPlatforms: {
        some: {
          id: {
            in: event.eventAppPlatforms.map(
              (eventAppPlatform) => eventAppPlatform.appPlatformId
            ),
          },
        },
      },
    },
    distinct: "id",
    orderBy: { name: "asc" },
    include: {
      studio: {
        select: {
          id: true,
          name: true,
          mainContact: {
            select: { user: { select: { id: true, name: true, email: true } } },
          },
        },
      },
    },
  });

  const appPlatformState = await prisma.eventAppPlatform.groupBy({
    by: ["status"],
    where: {
      eventId: params.eventId,
    },
    _count: { _all: true },
    orderBy: { status: "asc" },
  });

  const studios = sortBy(
    uniqWith(
      apps.map((app) => app.studio),
      isEqual
    ),
    (studio) => studio.name
  );

  return typedjson({ event, platforms, apps, appPlatformState, studios });
}

export default function Event() {
  const data = useTypedLoaderData<typeof loader>();

  const emails = data.studios
    .map((studio) =>
      studio.mainContact
        ? `"${studio.mainContact.user.name} - ${studio.name}" <${studio.mainContact.user.email}>`
        : null
    )
    .filter((emails) => emails !== null)
    .join(", ");

  return (
    <div>
      <p>
        <Link to="edit">Edit event</Link>
      </p>
      <h3>Event info</h3>
      <p>
        Runs from:{" "}
        <time dateTime={formatISO(data.event.runningFrom)}>
          {formatRFC7231(data.event.runningFrom)}
        </time>
      </p>
      <p>
        Runs until:{" "}
        <time dateTime={formatISO(data.event.runningTo)}>
          {formatRFC7231(data.event.runningTo)}
        </time>
      </p>
      <p>Visibility: {data.event.visibility}</p>
      <p>
        <Link to="coordinators">Event coordinators</Link>:{" "}
        {data.event.coordinators.length > 0
          ? jsxJoin(
              data.event.coordinators.map((coordinator) => (
                <Link
                  key={coordinator.user.id}
                  to={`/admin/users/${coordinator.user.id}`}
                >
                  {coordinator.user.name}
                </Link>
              )),
              ", "
            )
          : "No coordinators"}
      </p>

      <h3>Apps in the event</h3>
      <p>Total {data.apps.length} apps</p>
      <p>
        See <Link to="apps">full list of apps</Link>
      </p>

      <h3>Platforms in the event</h3>
      <p>Total {data.platforms.length} platforms</p>
      <div className="grid w-fit grid-cols-2 gap-x-8">
        {data.platforms.map((platform) => (
          <Fragment key={platform.id}>
            <span>{platform.name}</span>
            <div>
              <Link to={`apps?filters[platform][]=${platform.id}`}>
                {platform.appCount} apps
              </Link>
              <span> by {platform.studioCount} studios</span>
            </div>
          </Fragment>
        ))}
      </div>

      <h3>Platform state</h3>
      <p>Total {data.appPlatformState.length} platform states</p>
      <div className="grid w-fit grid-cols-2 gap-x-8">
        {data.appPlatformState.map((state) => (
          <Fragment key={state.status}>
            <span>{state.status}</span>
            <Link to={`apps?filters[status][]=${state.status}`}>
              {state._count._all} apps
            </Link>
          </Fragment>
        ))}
      </div>

      <h3>Studios in the event</h3>
      <p>Total {data.studios.length} studios</p>
      <p>
        <strong>Warning:</strong> This currently includes studios with games
        with a not OK_ platform state.
      </p>
      <details className="w-full">
        <summary>Toggle email formatting</summary>
        <div>
          <a href={`mailto:undisclosed-recipients?bcc=${emails}`}>Send email</a>
        </div>
        <textarea
          rows={6}
          className="w-1/2"
          readOnly
          defaultValue={emails}
        ></textarea>
      </details>
      <details>
        <summary>Toggle studio list</summary>
        <ul>
          {data.studios.map((studio) => (
            <li key={studio.id}>
              <Link to={`/admin/studios/${studio.id}`}>{studio.name}</Link> (
              <Link to={`apps?filters[studio][]=${studio.id}`}>filter</Link>)
            </li>
          ))}
        </ul>
      </details>
    </div>
  );
}
