import type { Prisma, Studio } from "@prisma/client";
import { UrlType } from "@prisma/client";
import { Form } from "@remix-run/react";
import type { ActionArgs, LoaderArgs } from "@remix-run/server-runtime";
import { redirect } from "@remix-run/server-runtime";
import { z } from "zod";
import { zfd } from "zod-form-data";
import { MaxLinkCount } from "~/config";
import { prisma } from "~/db.server";
import { requireUserId } from "~/session.server";
import type { PageHandle } from "~/types/remix";

export async function action({ request, params }: ActionArgs) {
  await requireUserId(request);

  const schema = zfd.formData({
    name: zfd.text(),
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
              path: [`links[${linkIndex}].title`],
            });
          }
        });
        return arg;
      }),
  });

  const formData = await request.formData();
  const data = schema.parse(formData);

  let studioId: Studio["id"] | undefined;

  await prisma.$transaction(async (tx) => {
    const studio = await tx.studio.create({
      data: { name: data.name, comment: data.comment },
    });

    const links: Array<Prisma.StudioLinkCreateManyInput> = [];
    data.links.forEach((link) => {
      if (typeof link.url === "string" && typeof link.title === "string") {
        links.push({
          studioId: studio.id,
          url: link.url,
          title: link.title,
          type: link.type,
          comment: link.comment ?? null,
        });
      }
    });
    if (links.length > 0) {
      await tx.studioLink.createMany({
        data: links,
      });
    }

    studioId = studio.id;
  });

  if (typeof studioId !== "undefined") {
    return redirect(`/admin/studios/${studioId}`);
  }

  throw new Error("Failed to store studio");
}

export async function loader({ request, params }: LoaderArgs) {
  await requireUserId(request);
  return null;
}

export const handle: PageHandle = { breadcrumb: () => "New studio" };

export default function NewStudio() {
  return (
    <div>
      <h3>New studio</h3>
      <Form method="post" className="flex flex-col gap-4">
        <div className="grid grid-cols-[auto_auto] gap-4 w-fit">
          <label htmlFor="name">Studio name</label>
          <input type="text" name="name" id="name" />
          <label htmlFor="comment">Comment</label>
          <textarea name="comment"></textarea>
        </div>
        <details>
          <summary>Toggle links</summary>
          <div className="flex flex-wrap gap-x-8 gap-y-4 w-fit">
            {[...Array(MaxLinkCount).keys()].map((linkIndex) => (
              <fieldset key={linkIndex} className="border border-fieldset p-2">
                <legend>Link #{linkIndex + 1}</legend>
                <div className="grid grid-cols-[auto_auto] gap-x-4 gap-y-2 w-fit">
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
                  <label htmlFor={`links_${linkIndex}_comment`}>Comment</label>
                  <input
                    type="text"
                    name={`links[${linkIndex}].comment`}
                    id={`links_${linkIndex}_comment`}
                  />
                </div>
              </fieldset>
            ))}
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
