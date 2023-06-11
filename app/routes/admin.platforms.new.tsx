import { Form } from "@remix-run/react";
import type { ActionArgs, LoaderArgs } from "@remix-run/server-runtime";
import { redirect } from "@remix-run/server-runtime";
import { z } from "zod";
import { zfd } from "zod-form-data";

import { prisma } from "~/database.server";
import { PlatformType } from "~/prisma-client";
import { requireAdminUser } from "~/session.server";
import type { PageHandle } from "~/types/remix";

export async function action({ request }: ActionArgs) {
  await requireAdminUser(request);

  const schema = zfd.formData({
    name: zfd.text(),
    type: zfd.text(z.nativeEnum(PlatformType)),
    url: zfd.text(z.string().optional()),
    comment: zfd.text(z.string().optional()),
  });

  const formData = await request.formData();
  const data = schema.parse(formData);

  const platform = await prisma.platform.create({
    data: {
      name: data.name,
      type: data.type,
      url: data.url ?? null,
      comment: data.comment ?? null,
    },
  });

  throw redirect(`/admin/platforms/${platform.id}`);
}

export async function loader({ request }: LoaderArgs) {
  await requireAdminUser(request);
  return null;
}

export const handle: PageHandle = { breadcrumb: () => "New platform" };

export default function NewPlatform() {
  return (
    <div>
      <h3>New platform</h3>
      <Form method="post" className="flex flex-col gap-4">
        <div className="grid w-fit grid-cols-[auto_auto] gap-4">
          <label htmlFor="name">Platform name</label>
          <input type="text" name="name" id="name" />
          <label htmlFor="type">Type</label>
          <select name="type" id="type" defaultValue={PlatformType.Generic}>
            {Object.values(PlatformType).map((platformType) => (
              <option key={platformType} value={platformType}>
                {platformType}
              </option>
            ))}
          </select>
          <label htmlFor="url">URL</label>
          <input type="text" name="url" id="url" />
          <label htmlFor="comment">Comment</label>
          <textarea name="comment"></textarea>
        </div>
        <div className="flex gap-2">
          <button type="submit" className="button-primary">
            Save
          </button>
        </div>
      </Form>
    </div>
  );
}
