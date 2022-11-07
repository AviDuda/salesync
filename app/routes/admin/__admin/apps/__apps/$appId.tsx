import type { Prisma } from "~/prisma-client";
import { PlatformReleaseState } from "~/prisma-client";
import { UrlType } from "~/prisma-client";
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
import { Fragment } from "react";
import invariant from "tiny-invariant";
import { z } from "zod";
import { zfd } from "zod-form-data";
import { MaxLinkCount } from "~/config";
import { prisma } from "~/db.server";
import { requireAdminUser } from "~/session.server";
import type { PageHandle } from "~/types/remix";
import { nl2br } from "~/utils";

enum Intent {
  SaveAppPlatform = "save-app-platform",
  RemoveAppPlatform = "remove-app-platform",
}

export async function action({ request, params }: ActionArgs) {
  await requireAdminUser(request);
  invariant(params.appId, "Invalid app ID");

  const formData = await request.formData();

  const actionSchema = z.union([
    zfd.formData({
      intent: zfd.text(z.literal(Intent.SaveAppPlatform)),
      appPlatformId: zfd.text(),
      releaseState: zfd.text(z.nativeEnum(PlatformReleaseState)),
      isEarlyAccess: zfd.text(z.literal("on").optional()),
      isFreeToPlay: zfd.text(z.literal("on").optional()),
      comment: zfd.text(z.string().optional()),
      links: zfd
        .repeatable(
          z
            .object({
              url: zfd.text(z.string().optional()),
              title: zfd.text(z.string().optional()),
              type: zfd.text(z.nativeEnum(UrlType).optional()),
              comment: zfd.text(z.string().nullish()),
            })
            .array()
        )
        .superRefine((arg, ctx) => {
          arg.forEach((link, linkIndex) => {
            if (
              typeof link.url === "undefined" ||
              link.url.trim().length === 0
            ) {
              return;
            }
            if (
              typeof link.title !== "string" ||
              link.title.trim().length === 0
            ) {
              ctx.addIssue({
                code: "invalid_type",
                expected: "string",
                received: "undefined",
                path: [`links[${linkIndex}].title`],
              });
            }
          });
          return arg;
        }),
    }),
    zfd.formData({
      intent: zfd.text(z.literal(Intent.RemoveAppPlatform)),
      appPlatformId: zfd.text(),
    }),
  ]);

  const data = actionSchema.parse(formData);

  if (data.intent === Intent.RemoveAppPlatform) {
    await prisma.appPlatform.delete({ where: { id: data.appPlatformId } });
    return redirect(new URL(request.url).pathname);
  } else if (data.intent === Intent.SaveAppPlatform) {
    await prisma.$transaction(async (tx) => {
      await tx.appPlatform.update({
        where: { id: data.appPlatformId },
        data: {
          releaseState: data.releaseState,
          isEarlyAccess: data.isEarlyAccess === "on",
          isFreeToPlay: data.isFreeToPlay === "on",
          comment: data.comment,
          links: {
            deleteMany: { appPlatformId: data.appPlatformId },
          },
        },
      });
      const links: Array<Prisma.AppPlatformLinkCreateManyInput> = [];
      data.links.forEach((link) => {
        if (typeof link.url === "string" && typeof link.title === "string") {
          links.push({
            appPlatformId: data.appPlatformId,
            url: link.url,
            title: link.title,
            type: link.type,
            comment: link.comment ?? null,
          });
        }
      });
      if (links.length > 0) {
        await tx.appPlatformLink.createMany({
          data: links,
        });
      }
    });

    return redirect(new URL(request.url).pathname);
  }

  throw new Error("Invalid intent");
}

export async function loader({ request, params }: LoaderArgs) {
  await requireAdminUser(request);
  invariant(params.appId, "Invalid app ID");
  const app = await prisma.app.findUnique({
    where: { id: params.appId },
    include: {
      appPlatforms: {
        include: {
          platform: true,
          links: true,
          eventAppPlatforms: {
            select: { id: true, event: { select: { id: true, name: true } } },
          },
        },
        orderBy: { platform: { name: "asc" } },
      },
      studio: true,
    },
  });
  invariant(app, "App not found");

  return json({ app });
}
export type Loader = SerializeFrom<typeof loader>;

export const handle: PageHandle = { breadcrumb: ({ data }) => data?.app?.name };

export default function AppPage() {
  const data = useLoaderData<typeof loader>();
  const [searchParams] = useSearchParams();
  const editAppPlatform = searchParams.get("platform");

  return (
    <div>
      <h2>{data.app.name}</h2>

      <Outlet />

      <h3>Basic info</h3>
      <p>Type: {data.app.type}</p>
      <p>
        Studio:{" "}
        <Link to={`/admin/studios/${data.app.studioId}`}>
          {data.app.studio.name}
        </Link>
      </p>
      {data.app.comment && (
        <div>
          <p>Comment:</p>
          <div className="bg-secondary-section p-2 w-fit">
            {nl2br(data.app.comment)}
          </div>
        </div>
      )}
      <h3>Platforms</h3>
      <table className="table-auto w-full">
        <thead>
          <tr>
            <th>Platform</th>
            <th>Release state</th>
            <th className="text-center">Early Access</th>
            <th className="text-center">Free to play</th>
            <th>Events</th>
            <th>Links</th>
            <th>Comment</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {data.app.appPlatforms.map((appPlatform) => (
            <Fragment key={appPlatform.id}>
              <tr>
                <td>
                  <Link to={`/admin/platforms/${appPlatform.platformId}`}>
                    {appPlatform.platform.name}
                  </Link>
                </td>
                <td>{appPlatform.releaseState}</td>
                <td className="text-center">
                  <input
                    type="checkbox"
                    disabled
                    defaultChecked={appPlatform.isEarlyAccess}
                  />
                </td>
                <td className="text-center">
                  <input
                    type="checkbox"
                    disabled
                    defaultChecked={appPlatform.isFreeToPlay}
                  />
                </td>
                <td>
                  {appPlatform.eventAppPlatforms.length > 0 && (
                    <details>
                      <summary>
                        {appPlatform.eventAppPlatforms.length} events
                      </summary>
                      <ul>
                        {appPlatform.eventAppPlatforms.map(
                          (eventAppPlatform) => (
                            <li key={eventAppPlatform.id}>
                              <Link
                                to={`/admin/events/${eventAppPlatform.event.id}`}
                              >
                                {eventAppPlatform.event.name}
                              </Link>
                            </li>
                          )
                        )}
                      </ul>
                    </details>
                  )}
                </td>
                <td>
                  <ul>
                    {appPlatform.links.map((link) => (
                      <li key={link.id}>
                        <span>{link.type}: </span>
                        <a
                          href={link.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          title={link.comment ?? undefined}
                        >
                          {link.title}
                        </a>
                      </li>
                    ))}
                  </ul>
                </td>
                <td>
                  {appPlatform.comment && (
                    <span title={appPlatform.comment}>has comment</span>
                  )}
                </td>
                <td>
                  <Form method="get">
                    <button
                      type="submit"
                      name="platform"
                      value={appPlatform.id}
                    >
                      Edit
                    </button>
                  </Form>
                </td>
              </tr>
              {editAppPlatform === appPlatform.id && (
                <tr>
                  <td colSpan={5} className="bg-secondary-section p-4">
                    <Form method="post" className="flex flex-col gap-4">
                      <div className="grid grid-cols-2 gap-x-8 gap-y-2 w-fit">
                        <input
                          type="hidden"
                          name="appPlatformId"
                          value={appPlatform.id}
                        />
                        <div>
                          <label htmlFor="releaseState">
                            App status on platform
                          </label>
                        </div>
                        <select
                          name="releaseState"
                          id="releaseState"
                          defaultValue={appPlatform.releaseState}
                        >
                          {Object.entries(PlatformReleaseState).map(
                            ([key, name]) => (
                              <option key={key} value={key}>
                                {name}
                              </option>
                            )
                          )}
                        </select>
                      </div>
                      <div>
                        <input
                          type="checkbox"
                          name="isEarlyAccess"
                          id="isEarlyAccess"
                          defaultChecked={appPlatform.isEarlyAccess}
                        />
                        <label htmlFor="isEarlyAccess">Early Access</label>
                      </div>
                      <div>
                        <input
                          type="checkbox"
                          name="isFreeToPlay"
                          id="isFreeToPlay"
                          defaultChecked={appPlatform.isFreeToPlay}
                        />
                        <label htmlFor="isFreeToPlay">Free to play</label>
                      </div>
                      <div>
                        <div>
                          <label htmlFor="comment">Comment</label>
                        </div>
                        <textarea
                          name="comment"
                          id="comment"
                          defaultValue={appPlatform.comment ?? ""}
                        />
                      </div>
                      <div className="flex flex-wrap gap-x-8 gap-y-4 w-fit">
                        {[...Array(MaxLinkCount).keys()].map((linkIndex) => (
                          <fieldset
                            key={linkIndex}
                            className="border border-fieldset p-2"
                          >
                            <legend>Link #{linkIndex + 1}</legend>
                            <div className="grid grid-cols-[auto_auto] gap-x-4 gap-y-2 w-fit">
                              <label htmlFor={`links_${linkIndex}_url`}>
                                URL
                              </label>
                              <input
                                type="text"
                                name={`links[${linkIndex}].url`}
                                id={`links_${linkIndex}_url`}
                                defaultValue={appPlatform.links[linkIndex]?.url}
                                autoComplete="url"
                              />
                              <label htmlFor={`links_${linkIndex}_title`}>
                                Title
                              </label>
                              <input
                                type="text"
                                name={`links[${linkIndex}].title`}
                                id={`links_${linkIndex}_title`}
                                defaultValue={
                                  appPlatform.links[linkIndex]?.title
                                }
                              />
                              <label htmlFor={`links_${linkIndex}_type`}>
                                Type
                              </label>
                              <select
                                name={`links[${linkIndex}].type`}
                                id={`links_${linkIndex}_type`}
                                defaultValue={
                                  appPlatform.links[linkIndex]?.type ??
                                  UrlType.Other
                                }
                              >
                                {Object.entries(UrlType).map(([key, name]) => (
                                  <option key={key} value={key}>
                                    {name}
                                  </option>
                                ))}
                              </select>
                              <label htmlFor={`links_${linkIndex}_comment`}>
                                Comment
                              </label>
                              <input
                                type="text"
                                name={`links[${linkIndex}].comment`}
                                id={`links_${linkIndex}_comment`}
                                defaultValue={
                                  appPlatform.links[linkIndex]?.comment ?? ""
                                }
                              />
                            </div>
                          </fieldset>
                        ))}
                      </div>
                      <div className="flex gap-2">
                        <button
                          type="submit"
                          name="intent"
                          value={Intent.SaveAppPlatform}
                          className="button-primary"
                        >
                          Save
                        </button>
                        <button
                          type="submit"
                          name="intent"
                          value={Intent.RemoveAppPlatform}
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
    </div>
  );
}
