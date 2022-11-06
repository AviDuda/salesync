import { AppType } from "~/prisma-client";
import { Form, useLoaderData } from "@remix-run/react";
import type { ActionArgs, LoaderArgs } from "@remix-run/server-runtime";
import { redirect } from "@remix-run/server-runtime";
import invariant from "tiny-invariant";
import { z } from "zod";
import { zfd } from "zod-form-data";
import { prisma } from "~/db.server";
import { requireAdminUser } from "~/session.server";
import type { PageHandle } from "~/types/remix";
import { useMatchesData } from "~/utils";
import type { Loader } from "../$appId";

enum Intent {
  Save = "save",
  Remove = "remove",
}

export async function action({ request, params }: ActionArgs) {
  await requireAdminUser(request);
  invariant(params.appId, "Invalid app ID");

  const schema = z.union([
    zfd.formData({
      intent: zfd.text(z.literal(Intent.Save)),
      appName: zfd.text(),
      appType: zfd.text(z.nativeEnum(AppType)),
      studioId: zfd.text(),
      comment: zfd.text(z.string().optional()),
    }),
    zfd.formData({
      intent: zfd.text(z.literal(Intent.Remove)),
    }),
  ]);

  const formData = await request.formData();
  const data = schema.parse(formData);

  if (data.intent === Intent.Save) {
    await prisma.app.update({
      where: { id: params.appId },
      data: {
        name: data.appName,
        type: data.appType,
        studioId: data.studioId,
        comment: data.comment,
      },
    });

    return redirect(`/admin/apps/${params.appId}`);
  } else if (data.intent === Intent.Remove) {
    await prisma.app.delete({ where: { id: params.appId } });
    return redirect(`/admin/apps`);
  }

  throw new Error("Invalid intent");
}

export async function loader({ request, params }: LoaderArgs) {
  await requireAdminUser(request);
  invariant(params.appId, "Invalid app ID");

  const studios = await prisma.studio.findMany({
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
  return { studios };
}

export const handle: PageHandle = { breadcrumb: () => "Edit app" };

export default function AppEdit() {
  const loaderData = useLoaderData<typeof loader>();
  const appData = useMatchesData<Loader>(
    "routes/admin/__admin/apps/__apps/$appId"
  );
  invariant(appData?.app, "Missing app data");

  return (
    <div>
      <h3>Edit app</h3>
      <Form method="post" className="flex flex-col gap-4">
        <div className="grid grid-cols-[auto_auto] gap-4 w-fit">
          <label htmlFor="appName">App name</label>
          <input
            type="text"
            name="appName"
            id="appName"
            defaultValue={appData.app.name}
          />
          <label htmlFor="appType">App type</label>
          <select name="appType" id="appType" defaultValue={appData.app.type}>
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
            defaultValue={appData.app.studioId}
          >
            {loaderData.studios.map((studio) => (
              <option key={studio.id} value={studio.id}>
                {studio.name}
              </option>
            ))}
          </select>
          <label htmlFor="comment">Comment</label>
          <textarea
            name="comment"
            id="comment"
            defaultValue={appData.app.comment ?? ""}
          />
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
