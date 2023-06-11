import type { LoaderArgs } from "@remix-run/node";
import { Link } from "@remix-run/react";
import { formatISO, isFuture, isPast } from "date-fns";
import { Fragment } from "react";
import { typedjson, useTypedLoaderData } from "remix-typedjson";

import { prisma } from "~/database.server";
import { requireAdminUser } from "~/session.server";
import { dateToYearMonthDay } from "~/utils";

export async function loader({ request }: LoaderArgs) {
  await requireAdminUser(request);
  const allEvents = await prisma.event.findMany({
    include: { eventAppPlatforms: { select: { appPlatformId: true } } },
    orderBy: [{ runningFrom: "desc" }, { runningTo: "desc" }],
  });

  const events: Record<"past" | "current" | "future", typeof allEvents> = {
    past: allEvents.filter(
      (event) => isPast(event.runningFrom) && isPast(event.runningTo)
    ),
    current: allEvents.filter(
      (event) => isPast(event.runningFrom) && !isPast(event.runningTo)
    ),
    future: allEvents.filter(
      (event) => isFuture(event.runningFrom) && isFuture(event.runningTo)
    ),
  };

  return typedjson({ events });
}

export default function Events() {
  const data = useTypedLoaderData<typeof loader>();

  function renderEvents(events: typeof data.events.current) {
    return (
      <div className="grid w-fit grid-cols-[auto_auto] items-center gap-x-8">
        {events.map((event) => (
          <Fragment key={event.id}>
            <h3>
              <Link to={`/admin/events/${event.id}`}>{event.name}</Link>
            </h3>
            <p>
              Runs from{" "}
              <time dateTime={formatISO(event.runningFrom)}>
                {dateToYearMonthDay(event.runningFrom)}
              </time>{" "}
              until{" "}
              <time dateTime={formatISO(event.runningTo)}>
                {dateToYearMonthDay(event.runningTo)}
              </time>
            </p>
          </Fragment>
        ))}
      </div>
    );
  }

  return (
    <div>
      <h2>Events</h2>
      <Link to="new">New event</Link>

      <h3>Currently running events</h3>
      {data.events.current.length > 0
        ? renderEvents(data.events.current)
        : "No currently running events."}

      <h3>Future events</h3>
      {data.events.future.length > 0
        ? renderEvents(data.events.future)
        : "No events in the future."}

      <h3>Past events</h3>
      {data.events.past.length > 0 ? (
        <details>
          <summary>Toggle past {data.events.past.length} events</summary>
          {renderEvents(data.events.past)}
        </details>
      ) : (
        "No currently running events."
      )}
    </div>
  );
}
