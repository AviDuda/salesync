import { Form, useLoaderData } from "@remix-run/react";
import type { ActionArgs, LoaderArgs } from "@remix-run/server-runtime";
import { json } from "@remix-run/server-runtime";
import { redirect } from "@remix-run/server-runtime";
import { z } from "zod";
import { zfd } from "zod-form-data";

import { MaxLinkCount } from "~/config";
import { prisma } from "~/database.server";
import { UrlType } from "~/prisma-client";
import type { Prisma, Studio } from "~/prisma-client";
import { requireAdminUser } from "~/session.server";
import type { PageHandle } from "~/types/remix";

export async function action({ request }: ActionArgs) {
  await requireAdminUser(request);

  const schema = zfd.formData({
    name: zfd.text(),
    mainContactId: zfd.text(z.string().optional()),
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

  const formData = await request.formData();
  const data = schema.parse(formData);

  let studioId: Studio["id"] | undefined;

  await prisma.$transaction(async (tx) => {
    const studio = await tx.studio.create({
      data: {
        name: data.name,
        comment: data.comment ?? null,
      },
    });

    if (data.mainContactId) {
      const studioMember = await tx.studioMember.create({
        data: { userId: data.mainContactId, studioId: studio.id },
      });
      await tx.studio.update({
        where: { id: studio.id },
        data: { mainContactId: studioMember.id },
      });
    }

    const links: Array<Prisma.StudioLinkCreateManyInput> = [];
    for (const link of data.links) {
      if (typeof link.url === "string" && typeof link.title === "string") {
        links.push({
          studioId: studio.id,
          url: link.url,
          title: link.title,
          type: link.type,
          comment: link.comment ?? null,
        });
      }
    }
    if (links.length > 0) {
      await tx.studioLink.createMany({
        data: links,
      });
    }

    studioId = studio.id;
  });

  if (studioId !== undefined) {
    return redirect(`/admin/studios/${studioId}`);
  }

  throw new Error("Failed to store studio");
}

export async function loader({ request }: LoaderArgs) {
  await requireAdminUser(request);

  const users = await prisma.user.findMany({
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  return json({ users });
}

export const handle: PageHandle = { breadcrumb: () => "New studio" };

export default function NewStudio() {
  const data = useLoaderData<typeof loader>();

  return (
    <div>
      <h3>New studio</h3>
      <Form method="post" className="flex flex-col gap-4">
        <div className="grid w-fit grid-cols-[auto_auto] gap-4">
          <label htmlFor="name">Studio name</label>
          <input type="text" name="name" id="name" />
          <label htmlFor="mainContactId">Main contact</label>
          <select name="mainContactId" id="mainContactId" defaultValue="">
            <option value="">(no contact set)</option>
            {data.users.map((user) => (
              <option key={user.id} value={user.id}>
                {user.name}
              </option>
            ))}
          </select>
          <label htmlFor="comment">Comment</label>
          <textarea name="comment"></textarea>
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
        <div className="flex gap-2">
          <button type="submit" className="button-primary">
            Save
          </button>
        </div>
      </Form>
    </div>
  );
}
