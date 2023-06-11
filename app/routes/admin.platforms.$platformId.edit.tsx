import { Form } from "@remix-run/react";
import type { ActionArgs, LoaderArgs } from "@remix-run/server-runtime";
import { redirect } from "@remix-run/server-runtime";
import invariant from "tiny-invariant";
import { z } from "zod";
import { zfd } from "zod-form-data";

import type { Loader } from "./admin.platforms.$platformId";

import { prisma } from "~/database.server";
import { PlatformType } from "~/prisma-client";
import { requireAdminUser } from "~/session.server";
import type { PageHandle } from "~/types/remix";
import { useMatchesData } from "~/utils";

enum Intent {
  Save = "save",
  Remove = "remove",
}

export async function action({ request, params }: ActionArgs) {
  await requireAdminUser(request);
  invariant(params.platformId, "Invalid platform ID");

  const schema = z.union([
    zfd.formData({
      intent: zfd.text(z.literal(Intent.Save)),
      name: zfd.text(),
      type: zfd.text(z.nativeEnum(PlatformType)),
      url: zfd.text(z.string().optional()),
      comment: zfd.text(z.string().optional()),
    }),
    zfd.formData({
      intent: zfd.text(z.literal(Intent.Remove)),
    }),
  ]);

  const formData = await request.formData();
  const data = schema.parse(formData);

  if (data.intent === Intent.Save) {
    await prisma.platform.update({
      where: { id: params.platformId },
      data: {
        name: data.name,
        type: data.type,
        url: data.url ?? null,
        comment: data.comment ?? null,
      },
    });

    return redirect(`/admin/platforms/${params.platformId}`);
  } else if (data.intent === Intent.Remove) {
    await prisma.platform.delete({ where: { id: params.platformId } });
    return redirect(`/admin/platforms`);
  }

  throw new Error("Invalid intent");
}

export async function loader({ request, params }: LoaderArgs) {
  await requireAdminUser(request);
  invariant(params.platformId, "Invalid platform ID");
  return null;
}

export const handle: PageHandle = { breadcrumb: () => "Edit platform" };

export default function PlatformEdit() {
  const data = useMatchesData<Loader>(
    "routes/admin/__admin/platforms/__platforms/$platformId"
  );
  invariant(data, "Missing platform data");

  return (
    <div>
      <h3>Edit platform</h3>
      <Form method="post" className="flex flex-col gap-4">
        <div className="grid w-fit grid-cols-[auto_auto] gap-4">
          <label htmlFor="name">Platform name</label>
          <input
            type="text"
            name="name"
            id="name"
            defaultValue={data.platform.name}
          />
          <label htmlFor="type">Type</label>
          <select name="type" id="type" defaultValue={data.platform.type}>
            {Object.values(PlatformType).map((platformType) => (
              <option key={platformType} value={platformType}>
                {platformType}
              </option>
            ))}
          </select>
          <label htmlFor="url">URL</label>
          <input
            type="text"
            name="url"
            id="url"
            defaultValue={data.platform.url ?? ""}
          />
          <label htmlFor="comment">Comment</label>
          <textarea
            name="comment"
            defaultValue={data.platform.comment ?? ""}
          ></textarea>
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
