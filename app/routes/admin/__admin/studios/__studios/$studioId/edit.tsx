import type { Prisma } from "~/prisma-client";
import { UrlType } from "~/prisma-client";
import { Form } from "@remix-run/react";
import type { ActionArgs, LoaderArgs } from "@remix-run/server-runtime";
import { redirect } from "@remix-run/server-runtime";
import invariant from "tiny-invariant";
import { z } from "zod";
import { zfd } from "zod-form-data";
import EmptyOption from "~/components/EmptyOption";
import { MaxLinkCount } from "~/config";
import { prisma } from "~/db.server";
import { requireAdminUser } from "~/session.server";
import type { PageHandle } from "~/types/remix";
import { useMatchesData } from "~/utils";
import type { Loader } from "../$studioId";

enum Intent {
  Save = "save",
  Remove = "remove",
}

export async function action({ request, params }: ActionArgs) {
  await requireAdminUser(request);
  const { studioId } = params;
  invariant(studioId, "Invalid studio ID");

  const schema = z.union([
    zfd.formData({
      intent: zfd.text(z.literal(Intent.Save)),
      name: zfd.text(),
      mainContact: zfd.text(z.string().optional()),
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
      intent: zfd.text(z.literal(Intent.Remove)),
    }),
  ]);

  const formData = await request.formData();
  const data = schema.parse(formData);

  if (data.intent === Intent.Save) {
    await prisma.$transaction(async (tx) => {
      await tx.studio.update({
        where: { id: studioId },
        data: {
          name: data.name,
          mainContactId: data.mainContact,
          comment: data.comment,
        },
      });

      const links: Array<Prisma.StudioLinkCreateManyInput> = [];
      data.links.forEach((link) => {
        if (typeof link.url === "string" && typeof link.title === "string") {
          links.push({
            studioId,
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
    });
    return redirect(`/admin/studios/${studioId}`);
  } else if (data.intent === Intent.Remove) {
    await prisma.studio.delete({ where: { id: params.studioId } });
    return redirect(`/admin/studios`);
  }

  throw new Error("Invalid intent");
}

export async function loader({ request, params }: LoaderArgs) {
  await requireAdminUser(request);
  invariant(params.studioId, "Invalid studio ID");
  return null;
}

export const handle: PageHandle = { breadcrumb: () => "Edit studio" };

export default function StudioEdit() {
  const data = useMatchesData<Loader>(
    "routes/admin/__admin/studios/__studios/$studioId"
  );
  invariant(data, "Missing studio data");

  return (
    <div>
      <h3>Edit studio</h3>
      <Form method="post" className="flex flex-col gap-4">
        <div className="grid grid-cols-[auto_auto] gap-4 w-fit">
          <label htmlFor="name">Studio name</label>
          <input
            type="text"
            name="name"
            id="name"
            defaultValue={data.studio.name}
          />
          <label htmlFor="mainContactId">Main contact</label>
          <select
            name="mainContactId"
            id="mainContactId"
            defaultValue={data.studio.mainContactId ?? ""}
          >
            <EmptyOption />
            {data.studio.members.map((member) => (
              <option key={member.id} value={member.id}>
                {member.user.name}
              </option>
            ))}
          </select>
          <label htmlFor="comment">Comment</label>
          <textarea
            name="comment"
            defaultValue={data.studio.comment ?? ""}
          ></textarea>
        </div>
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
                  defaultValue={data.studio.links[linkIndex]?.url}
                  autoComplete="url"
                />
                <label htmlFor={`links_${linkIndex}_title`}>Title</label>
                <input
                  type="text"
                  name={`links[${linkIndex}].title`}
                  id={`links_${linkIndex}_title`}
                  defaultValue={data.studio.links[linkIndex]?.title}
                />
                <label htmlFor={`links_${linkIndex}_type`}>Type</label>
                <select
                  name={`links[${linkIndex}].type`}
                  id={`links_${linkIndex}_type`}
                  defaultValue={
                    data.studio.links[linkIndex]?.type ?? UrlType.Other
                  }
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
                  defaultValue={data.studio.links[linkIndex]?.comment ?? ""}
                />
              </div>
            </fieldset>
          ))}
        </div>
        <div className="flex gap-2">
          <button
            type="submit"
            name="intent"
            value={Intent.Save}
            className="button-primary"
          >
            Save
          </button>
          <button
            type="submit"
            name="intent"
            value={Intent.Remove}
            className="button-destructive"
          >
            X
          </button>
        </div>
      </Form>
    </div>
  );
}
