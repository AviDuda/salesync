import { Form, Link, useLoaderData } from "@remix-run/react";
import type { ActionArgs, LoaderArgs } from "@remix-run/server-runtime";
import { json } from "@remix-run/server-runtime";
import { redirect } from "@remix-run/server-runtime";
import invariant from "tiny-invariant";
import { z } from "zod";
import { zfd } from "zod-form-data";

import EmptyOption from "~/components/EmptyOption";
import { MaxLinkCount } from "~/config";
import { prisma } from "~/database.server";
import { UrlType } from "~/prisma-client";
import { PlatformReleaseState } from "~/prisma-client";
import type { Prisma } from "~/prisma-client";
import { requireAdminUser } from "~/session.server";
import type { PageHandle } from "~/types/remix";

export async function action({ request, params }: ActionArgs) {
  await requireAdminUser(request);
  const appId = params.appId;
  invariant(appId, "Invalid app ID");

  const formData = await request.formData();

  const actionSchema = zfd.formData({
    platformId: zfd.text(),
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
      .superRefine((argument, context_) => {
        for (const [linkIndex, link] of argument.entries()) {
          if (link.url === undefined || link.url.trim().length === 0) {
            continue;
          }
          if (
            typeof link.title !== "string" ||
            link.title.trim().length === 0
          ) {
            context_.addIssue({
              code: "invalid_type",
              expected: "string",
              received: "undefined",
              path: [`links[${linkIndex}].title`],
            });
          }
        }
        return argument;
      }),
  });

  const data = actionSchema.parse(formData);

  await prisma.$transaction(async (tx) => {
    const appPlatform = await tx.appPlatform.create({
      data: {
        appId: appId,
        platformId: data.platformId,
        releaseState: data.releaseState,
        isEarlyAccess: data.isEarlyAccess === "on",
        isFreeToPlay: data.isFreeToPlay === "on",
        comment: data.comment ?? null,
      },
    });

    const links: Array<Prisma.AppPlatformLinkCreateManyInput> = [];
    for (const link of data.links) {
      if (typeof link.url === "string" && typeof link.title === "string") {
        links.push({
          appPlatformId: appPlatform.id,
          url: link.url,
          title: link.title,
          type: link.type,
          comment: link.comment ?? null,
        });
      }
    }
    if (links.length > 0) {
      await tx.appPlatformLink.createMany({
        data: links,
      });
    }
  });

  return redirect(`/admin/apps/${appId}`);
}

export async function loader({ request, params }: LoaderArgs) {
  await requireAdminUser(request);
  invariant(params.appId, "Invalid app ID");

  const platforms = await prisma.platform.findMany({
    where: { appPlatforms: { none: { appId: params.appId } } },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  return json({ platforms });
}

export const handle: PageHandle = { breadcrumb: () => "Add platform" };

export default function AddPlatformToApp() {
  const data = useLoaderData<typeof loader>();

  return (
    <div className="py-4">
      <h3>Add platform</h3>
      {data.platforms.length === 0 ? (
        <p>
          This app is already available on all{" "}
          <Link to="/admin/platforms">platforms</Link>.
        </p>
      ) : (
        <Form method="post" className="flex flex-col gap-4">
          <div className="grid w-fit grid-cols-[auto_auto] gap-4">
            <label htmlFor="platformId">Platform</label>
            <select name="platformId" id="platformId" defaultValue="">
              <EmptyOption />
              {data.platforms.map((platform) => (
                <option key={platform.id} value={platform.id}>
                  {platform.name}
                </option>
              ))}
            </select>
            <label htmlFor="releaseState">Release state</label>
            <select name="releaseState" id="releaseState" defaultValue="">
              <EmptyOption />
              {Object.entries(PlatformReleaseState).map(([key, name]) => (
                <option key={key} value={key}>
                  {name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <input type="checkbox" name="isEarlyAccess" id="isEarlyAccess" />
            <label htmlFor="isEarlyAccess">Early Access</label>
          </div>
          <div>
            <input type="checkbox" name="isFreeToPlay" id="isFreeToPlay" />
            <label htmlFor="isFreeToPlay">Free to play</label>
          </div>
          <div className="grid w-fit grid-cols-[auto_auto] items-center gap-4">
            <label htmlFor="comment">Comment</label>
            <textarea name="comment" id="comment" />
          </div>
          <details>
            <summary>Toggle links</summary>
            <div className="flex w-fit flex-wrap gap-x-8 gap-y-4">
              {[...Array.from({ length: MaxLinkCount }).keys()].map(
                (linkIndex) => (
                  <fieldset
                    key={linkIndex}
                    className="border border-fieldset p-2"
                  >
                    <legend>Link #{linkIndex + 1}</legend>
                    <div className="grid w-fit grid-cols-[auto_auto] gap-x-4 gap-y-2">
                      <label htmlFor={`links_${linkIndex}_url`}>URL</label>
                      <input
                        type="text"
                        name={`links[${linkIndex}].url`}
                        id={`links_${linkIndex}_url`}
                      />
                      <label htmlFor={`links_${linkIndex}_title`}>Title</label>
                      <input
                        type="text"
                        name={`links[${linkIndex}].title`}
                        id={`links_${linkIndex}_title`}
                      />
                      <label htmlFor={`links_${linkIndex}_type`}>Type</label>
                      <select
                        name={`links[${linkIndex}].type`}
                        id={`links_${linkIndex}_type`}
                        defaultValue={UrlType.Other}
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
                      />
                    </div>
                  </fieldset>
                )
              )}
            </div>
          </details>
          <div>
            <button type="submit" className="button-primary">
              Save
            </button>
          </div>
        </Form>
      )}
    </div>
  );
}
