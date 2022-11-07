import type { Event, Platform } from "~/prisma-client";
import {
  Form,
  Link,
  Outlet,
  useLoaderData,
  useSearchParams,
} from "@remix-run/react";
import type {
  ActionArgs,
  LoaderArgs,
  SerializeFrom,
} from "@remix-run/server-runtime";
import { redirect } from "@remix-run/server-runtime";
import { json } from "@remix-run/server-runtime";
import { omit } from "lodash";
import { Fragment } from "react";
import invariant from "tiny-invariant";
import { z } from "zod";
import { zfd } from "zod-form-data";
import { prisma } from "~/db.server";
import { requireAdminUser } from "~/session.server";
import type { PageHandle } from "~/types/remix";
import { nl2br } from "~/utils";

enum Intent {
  SaveMember = "save-member",
  RemoveMember = "remove-member",
}
export async function action({ request, params }: ActionArgs) {
  await requireAdminUser(request);
  invariant(params.studioId, "Invalid studio ID");

  const formData = await request.formData();

  const actionSchema = z.union([
    zfd.formData({
      intent: zfd.text(z.literal(Intent.SaveMember)),
      studioMemberId: zfd.text(),
      userId: zfd.text(),
      position: zfd.text(z.string().optional()),
      comment: zfd.text(z.string().optional()),
      setAsMainContact: zfd.text(z.literal("on")).nullish(),
    }),
    zfd.formData({
      intent: zfd.text(z.literal(Intent.RemoveMember)),
      studioMemberId: zfd.text(),
      userId: zfd.text(),
    }),
  ]);

  const data = actionSchema.parse(formData);

  if (data.intent === Intent.RemoveMember) {
    await prisma.studioMember.delete({ where: { id: data.studioMemberId } });
    return redirect(new URL(request.url).pathname);
  } else if (data.intent === Intent.SaveMember) {
    await prisma.studioMember.update({
      where: { id: data.studioMemberId },
      data: {
        position: data.position ?? null,
        comment: data.comment ?? null,
      },
    });

    if (data.setAsMainContact === "on") {
      await prisma.studio.update({
        where: { id: params.studioId },
        data: { mainContactId: data.studioMemberId },
      });
    }

    return redirect(new URL(request.url).pathname);
  }

  throw new Error("Invalid intent");
}
export async function loader({ request, params }: LoaderArgs) {
  await requireAdminUser(request);
  invariant(params.studioId, "Invalid studio ID");

  const studioResult = await prisma.studio.findUnique({
    where: { id: params.studioId },
    include: {
      apps: {
        include: {
          appPlatforms: {
            select: {
              platform: { select: { id: true, name: true } },
              eventAppPlatforms: {
                select: { event: { select: { id: true, name: true } } },
              },
            },
          },
        },
        orderBy: { name: "asc" },
      },
      mainContact: {
        select: { user: { select: { id: true, name: true, email: true } } },
      },
      members: { include: { user: true }, orderBy: { user: { name: "asc" } } },
      links: { orderBy: { type: "asc" } },
    },
  });
  invariant(studioResult, "Studio not found");

  const studio = {
    ...studioResult,
    apps: studioResult.apps.map((app) => {
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
        platforms: [...platforms.values()],
        events: [...events.values()],
      };
    }),
  };

  return json({ studio });
}

export type Loader = SerializeFrom<typeof loader>;

export const handle: PageHandle = {
  breadcrumb: ({ data }) => data?.studio?.name,
};

export default function Studio() {
  const data = useLoaderData<typeof loader>();
  const [searchParams] = useSearchParams();
  const memberEdit = searchParams.get("member");

  return (
    <div>
      <h2>Studio {data.studio.name}</h2>

      <div className="my-2">
        <Outlet />
      </div>

      <h3>Basic info</h3>
      <span>Main contact: </span>
      {data.studio.mainContact === null ? (
        "No main contact selected"
      ) : (
        <>
          <Link to={`/admin/users/${data.studio.mainContact.user.id}`}>
            {data.studio.mainContact.user.name}
          </Link>
          <span>
            {" "}
            (
            <a href={`mailto:${data.studio.mainContact.user.email}`}>
              {data.studio.mainContact.user.email}
            </a>
            )
          </span>
        </>
      )}
      {data.studio.comment && (
        <div>
          <p>Comment:</p>
          <div className="bg-secondary-section p-2 w-fit">
            {nl2br(data.studio.comment)}
          </div>
        </div>
      )}

      {data.studio.links.length > 0 && (
        <div>
          <h3>Links</h3>
          {data.studio.links.map((link) => (
            <p key={link.id}>
              <span>{link.type}: </span>
              <a
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                title={link.comment ?? undefined}
              >
                {link.title}
              </a>
            </p>
          ))}
        </div>
      )}

      <h3>Members</h3>
      <table className="table-auto w-full">
        <thead>
          <tr>
            <th className="text-left">Name</th>
            <th className="text-left">Email</th>
            <th className="text-left">Position</th>
            <th className="text-left">Comment</th>
            <th className="text-left">Actions</th>
          </tr>
        </thead>
        <tbody>
          {data.studio.members.map((member) => (
            <Fragment key={member.id}>
              <tr>
                <td>
                  <Link to={`/admin/users/${member.userId}`}>
                    {member.user.name}
                  </Link>
                </td>
                <td>{member.user.email}</td>
                <td>{member.position}</td>
                <td title={member.comment ?? undefined}>
                  {member.comment && "has comment"}
                </td>
                <td>
                  <Form method="get">
                    <button type="submit" name="member" value={member.id}>
                      Edit
                    </button>
                  </Form>
                </td>
              </tr>
              {memberEdit === member.id && (
                <tr>
                  <td colSpan={5} className="bg-secondary-section p-4">
                    <Form
                      method="post"
                      className="grid grid-cols-2 gap-2 w-fit"
                    >
                      <input
                        type="hidden"
                        name="studioMemberId"
                        value={member.id}
                      />
                      <input
                        type="hidden"
                        name="userId"
                        value={member.userId}
                      />
                      <label htmlFor="position">Position</label>
                      <input
                        type="text"
                        name="position"
                        id="position"
                        defaultValue={member.position ?? undefined}
                      />
                      <label htmlFor="comment">Comment</label>
                      <textarea
                        name="comment"
                        id="comment"
                        defaultValue={member.comment ?? ""}
                      />
                      <div className="flex gap-2 col-span-2">
                        <input
                          type="checkbox"
                          name="setAsMainContact"
                          defaultChecked={
                            data.studio.mainContactId === member.userId
                          }
                          id="setAsMainContact"
                        />
                        <label htmlFor="setAsMainContact">
                          Set as main contact for studio
                        </label>
                      </div>
                      <div className="flex gap-2">
                        <button
                          type="submit"
                          name="intent"
                          value={Intent.SaveMember}
                          className="button-primary"
                        >
                          Save member
                        </button>
                        <button
                          type="submit"
                          name="intent"
                          value={Intent.RemoveMember}
                          className="button-destructive"
                        >
                          X
                        </button>
                      </div>
                    </Form>
                  </td>
                </tr>
              )}
            </Fragment>
          ))}
        </tbody>
      </table>

      <h3>Apps</h3>
      <table className="table-auto w-full">
        <thead>
          <tr>
            <th>Name</th>
            <th>Type</th>
            <th>Events</th>
            <th>Platforms</th>
            <th>Comment</th>
          </tr>
        </thead>
        <tbody>
          {data.studio.apps.map((app) => (
            <Fragment key={app.id}>
              <tr>
                <td>
                  <Link to={`/admin/apps/${app.id}`}>{app.name}</Link>
                </td>
                <td>{app.type}</td>
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
            </Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
}
