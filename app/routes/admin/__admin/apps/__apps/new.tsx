import type { App, Prisma } from "~/prisma-client";
import { UrlType } from "~/prisma-client";
import { PlatformReleaseState } from "~/prisma-client";
import { AppType } from "~/prisma-client";
import { Form, useLoaderData, useSearchParams } from "@remix-run/react";
import type { ActionArgs, LoaderArgs } from "@remix-run/server-runtime";
import { redirect } from "@remix-run/server-runtime";
import { json } from "@remix-run/server-runtime";
import { z } from "zod";
import { zfd } from "zod-form-data";
import EmptyOption from "~/components/EmptyOption";
import { MaxLinkCount } from "~/config";
import { prisma } from "~/db.server";
import { requireAdminUser } from "~/session.server";
import type { PageHandle } from "~/types/remix";

export async function action({ request }: ActionArgs) {
  await requireAdminUser(request);

  const schema = zfd
    .formData({
      appName: zfd.text(),
      appType: zfd.text(z.nativeEnum(AppType)),
      studioId: zfd.text(),
      comment: zfd.text(z.string().optional()),
      platforms: zfd.repeatable(
        z
          .object({
            platformId: zfd.text(),
            checked: zfd.text(z.literal("on").optional()),
            releaseState: zfd.text(z.nativeEnum(PlatformReleaseState)),
            isEarlyAccess: zfd.text(z.literal("on").optional()),
            isFreeToPlay: zfd.text(z.literal("on").optional()),
            comment: zfd.text(z.string().optional()),
            links: zfd.repeatable(
              z
                .object({
                  url: zfd.text(z.string().optional()),
                  title: zfd.text(z.string().optional()),
                  type: zfd.text(z.nativeEnum(UrlType).optional()),
                  comment: zfd.text(z.string().nullish()),
                })
                .array()
            ),
          })
          .array()
      ),
    })
    .superRefine((arg, ctx) => {
      arg.platforms.forEach((platform, platformIndex) => {
        if (platform.checked !== "on") {
          return;
        }
        platform.links.forEach((link, linkIndex) => {
          if (typeof link.url === "undefined" || link.url.trim().length === 0) {
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
              path: [`platforms[${platformIndex}].links[${linkIndex}].title`],
            });
          }
        });
      });
      return arg;
    });

  const formData = await request.formData();
  const data = schema.parse(formData);

  const platforms: Array<
    Omit<Prisma.AppPlatformUncheckedCreateInput, "appId">
  > = [];
  data.platforms.forEach((platform) => {
    if (platform.checked !== "on") {
      return;
    }

    platforms.push({
      platformId: platform.platformId,
      releaseState: platform.releaseState,
      isEarlyAccess: platform.isEarlyAccess === "on",
      isFreeToPlay: platform.isFreeToPlay === "on",
      comment: platform.comment,
    });
  });

  let appId: App["id"] | undefined;

  await prisma.$transaction(async (tx) => {
    const app = await tx.app.create({
      data: {
        name: data.appName,
        type: data.appType,
        studioId: data.studioId,
        comment: data.comment,
        appPlatforms: {
          createMany: {
            data: platforms,
          },
        },
      },
      select: {
        id: true,
        appPlatforms: { select: { id: true, platformId: true } },
      },
    });

    const links: Array<Prisma.AppPlatformLinkCreateManyInput> = [];
    data.platforms.forEach((platform) => {
      const appPlatform = app.appPlatforms.find(
        (appPlatform) => appPlatform.platformId === platform.platformId
      );
      if (!appPlatform) {
        return;
      }
      platform.links.forEach((link) => {
        if (typeof link.url === "string" && typeof link.title === "string") {
          links.push({
            appPlatformId: appPlatform.id,
            url: link.url,
            title: link.title,
            type: link.type,
            comment: link.comment ?? null,
          });
        }
      });
    });

    if (links.length > 0) {
      await tx.appPlatformLink.createMany({
        data: links,
      });
    }

    appId = app.id;
  });

  if (typeof appId !== "undefined") {
    return redirect(`/admin/apps/${appId}`);
  }

  throw new Error("Failed to store app");
}

export async function loader({ request }: LoaderArgs) {
  await requireAdminUser(request);

  const platforms = await prisma.platform.findMany({
    select: {
      id: true,
      name: true,
    },
    orderBy: { name: "asc" },
  });

  const studios = await prisma.studio.findMany({
    select: {
      id: true,
      name: true,
    },
    orderBy: { name: "asc" },
  });

  return json({ platforms, studios });
}

export const handle: PageHandle = { breadcrumb: () => "New app" };

export default function AddApp() {
  const data = useLoaderData<typeof loader>();
  const [searchParams] = useSearchParams();

  let defaultStudioId = searchParams.get("studioId");
  if (
    defaultStudioId !== null &&
    data.studios.findIndex((studio) => studio.id === defaultStudioId) === -1
  ) {
    defaultStudioId = null;
  }

  return (
    <div>
      <h2>New app</h2>
      <Form method="post">
        <div className="grid grid-cols-[auto_auto] gap-4 w-fit">
          <label htmlFor="appName">App name</label>
          <input type="text" name="appName" id="appName" />
          <label htmlFor="appType">App type</label>
          <select name="appType" id="appType">
            {Object.entries(AppType).map(([key, name]) => (
              <option key={key} value={key}>
                {name}
              </option>
            ))}
          </select>
          <label htmlFor="studioId">Studio</label>
          <select
            name="studioId"
            id="studioId"
            defaultValue={defaultStudioId ?? ""}
          >
            <EmptyOption />
            {data.studios.map((studio) => (
              <option key={studio.id} value={studio.id}>
                {studio.name}
              </option>
            ))}
          </select>
          <label htmlFor="comment">Comment</label>
          <textarea name="comment" id="comment" />
        </div>
        <h3>Platforms</h3>
        <p className="mb-4">Check platforms you want to add.</p>
        <div className="flex flex-col gap-4">
          {data.platforms.map((platform, index) => {
            const name = `platforms[${index}]`;
            const id = `platforms_${index}`;
            return (
              <div key={platform.id}>
                <input
                  type="hidden"
                  name={`${name}.platformId`}
                  value={platform.id}
                />
                <div>
                  <input
                    type="checkbox"
                    name={`${name}.checked`}
                    id={`${id}_checked`}
                  />
                  <label htmlFor={`${id}_checked`}>{platform.name}</label>
                </div>
                <div className="px-4 py-2 bg-secondary-section w-fit">
                  <div className="flex flex-wrap gap-4 items-start">
                    <div>
                      <label htmlFor={`${id}_releaseState`}>
                        Release state
                      </label>
                    </div>
                    <select
                      name={`${name}.releaseState`}
                      id={`${id}_releaseState`}
                    >
                      {Object.entries(PlatformReleaseState).map(
                        ([key, name]) => (
                          <option key={key} value={key}>
                            {name}
                          </option>
                        )
                      )}
                    </select>
                    <div>
                      <input
                        type="checkbox"
                        name={`${name}.isEarlyAccess`}
                        id={`${id}_isEarlyAccess`}
                      />
                      <label htmlFor={`${id}_isEarlyAccess`}>
                        Early Access
                      </label>
                    </div>
                    <div>
                      <input
                        type="checkbox"
                        name={`${name}.isFreeToPlay`}
                        id={`${id}_isFreeToPlay`}
                      />
                      <label htmlFor={`${id}_isFreeToPlay`}>Free to play</label>
                    </div>
                    <div>
                      <label htmlFor={`${id}_comment}`}>Comment</label>
                    </div>
                    <textarea
                      name={`${name}_comment}`}
                      id={`${name}.comment`}
                      rows={1}
                    />
                  </div>
                  <details>
                    <summary>Toggle links</summary>
                    <div className="flex flex-wrap gap-x-8 gap-y-4">
                      {[...Array(MaxLinkCount).keys()].map((linkIndex) => (
                        <fieldset
                          key={linkIndex}
                          className="flex flex-col gap-2 border border-fieldset p-2"
                        >
                          <legend>Link #{linkIndex + 1}</legend>
                          <div className="grid-cols-[auto_auto] grid w-fit gap-4">
                            <label htmlFor={`${id}_links_${linkIndex}_url`}>
                              URL
                            </label>
                            <input
                              type="text"
                              name={`${name}.links[${linkIndex}].url`}
                              id={`${id}_links_${linkIndex}_url`}
                              autoComplete="url"
                            />
                            <label htmlFor={`${id}_links_${linkIndex}_title`}>
                              Title
                            </label>
                            <input
                              type="text"
                              name={`${name}.links[${linkIndex}].title`}
                              id={`${id}_links_${linkIndex}_title`}
                            />
                            <label htmlFor={`links_${linkIndex}_type`}>
                              Type
                            </label>
                            <select
                              name={`${name}.links[${linkIndex}].type`}
                              id={`${id}_links_${linkIndex}_type`}
                              defaultValue={UrlType.Other}
                            >
                              {Object.entries(UrlType).map(([key, name]) => (
                                <option key={key} value={key}>
                                  {name}
                                </option>
                              ))}
                            </select>
                            <label htmlFor={`${id}_links_${linkIndex}_comment`}>
                              Comment
                            </label>
                            <textarea
                              name={`${name}.links[${linkIndex}].comment`}
                              id={`${id}_links_${linkIndex}_comment`}
                            />
                          </div>
                        </fieldset>
                      ))}
                    </div>
                  </details>
                </div>
              </div>
            );
          })}
        </div>
        <div className="mt-4">
          <input type="submit" value="Add app" className="button-primary" />
        </div>
      </Form>
    </div>
  );
}
