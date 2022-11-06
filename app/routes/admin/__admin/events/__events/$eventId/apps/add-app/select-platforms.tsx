import type { Prisma } from "~/prisma-client";
import { EventAppPlatformStatus } from "~/prisma-client";
import { Form, Link, useLoaderData } from "@remix-run/react";
import type { ActionArgs, LoaderArgs } from "@remix-run/server-runtime";
import { redirect } from "@remix-run/server-runtime";
import { json } from "@remix-run/server-runtime";
import invariant from "tiny-invariant";
import { z } from "zod";
import { zfd } from "zod-form-data";
import EmptyOption from "~/components/EmptyOption";
import { prisma } from "~/db.server";
import { requireAdminUser } from "~/session.server";

export async function action({ request, params }: ActionArgs) {
  await requireAdminUser(request);
  const eventId = params.eventId;
  invariant(eventId, "Invalid event ID");

  const { searchParams } = new URL(request.url);
  const selectedAppId = searchParams.get("appId");
  invariant(selectedAppId, "Invalid app ID");

  const statusSchema = z.nativeEnum(EventAppPlatformStatus);
  const schema = zfd
    .formData({
      appPlatforms: zfd.repeatable(
        z
          .object({
            appPlatformId: zfd.text(),
            checked: zfd.text(z.literal("on").optional()),
            status: zfd.text(statusSchema.optional()),
            comment: zfd.text(z.string().optional()),
          })
          .array()
      ),
    })
    .superRefine((arg, ctx) => {
      const checkedPlatformCount = arg.appPlatforms.reduce((sum, platform) => {
        return platform.checked === "on" ? sum + 1 : sum;
      }, 0);
      if (checkedPlatformCount === 0) {
        ctx.addIssue({
          code: "custom",
          message: "No platforms selected",
          path: ["appPlatforms"],
        });
      }

      arg.appPlatforms.forEach((appPlatform, index) => {
        if (appPlatform.checked !== "on") {
          return;
        }

        // Check that a checked app platform has status set
        const parsedStatus = statusSchema.safeParse(appPlatform.status);
        if (!parsedStatus.success) {
          parsedStatus.error.issues.forEach((issue) => {
            ctx.addIssue({ ...issue, path: [`appPlatforms[${index}].status`] });
          });
        }
      });

      return arg;
    });

  const formData = await request.formData();
  const data = schema.parse(formData);

  const eventAppPlatforms: Array<Prisma.EventAppPlatformUncheckedCreateInput> =
    [];
  data.appPlatforms.forEach((appPlatform) => {
    if (
      appPlatform.checked !== "on" ||
      typeof appPlatform.status === "undefined"
    ) {
      return;
    }

    eventAppPlatforms.push({
      appPlatformId: appPlatform.appPlatformId,
      eventId,
      status: appPlatform.status,
      comment: appPlatform.comment,
    });
  });

  await prisma.eventAppPlatform.createMany({
    data: eventAppPlatforms,
    skipDuplicates: true,
  });

  return redirect(`/admin/events/${eventId}/apps`);
}

export async function loader({ request, params }: LoaderArgs) {
  await requireAdminUser(request);
  invariant(params.eventId, "Invalid event ID");

  const { searchParams } = new URL(request.url);
  const selectedAppId = searchParams.get("appId");
  invariant(selectedAppId, "Invalid app ID");

  const app = await prisma.app.findFirstOrThrow({
    where: { id: selectedAppId },
    select: { id: true, name: true },
  });

  const appPlatforms = await prisma.appPlatform.findMany({
    where: { appId: selectedAppId },
    select: {
      id: true,
      platform: { select: { name: true } },
    },
  });

  return json({ app, appPlatforms });
}

export default function SelectPlatforms() {
  const data = useLoaderData<typeof loader>();

  return (
    <div>
      <Form method="post">
        <p>
          Select platforms for app{" "}
          <Link to={`/admin/apps/${data.app.id}`}>{data.app.name}</Link>:
        </p>
        <div className="flex gap-4 flex-wrap">
          {data.appPlatforms.map((appPlatform, index) => {
            const name = `appPlatforms[${index}]`;
            const id = `appPlatforms_${index}`;
            return (
              <div key={appPlatform.id}>
                <input
                  type="hidden"
                  name={`${name}.appPlatformId`}
                  value={appPlatform.id}
                />
                <div>
                  <input
                    type="checkbox"
                    name={`${name}.checked`}
                    id={`${id}_checked`}
                  />
                  <label htmlFor={`${id}_checked`}>
                    {appPlatform.platform.name}
                  </label>
                </div>
                <div className="px-4 py-1 bg-secondary-section w-fit">
                  <div>
                    <label htmlFor={`${id}_status`}>Status</label>
                  </div>
                  <select
                    name={`${name}.status`}
                    id={`${id}_status`}
                    defaultValue=""
                  >
                    <EmptyOption />
                    {Object.entries(EventAppPlatformStatus).map(
                      ([key, name]) => (
                        <option key={key} value={key}>
                          {name}
                        </option>
                      )
                    )}
                  </select>
                  <div>
                    <label htmlFor={`${id}_comment`}>Comment</label>
                  </div>
                  <div>
                    <input
                      type="text"
                      name={`${name}.comment`}
                      id={`${id}_comment`}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        <div>
          <input type="submit" value="Add app" className="button-primary" />
        </div>
      </Form>
    </div>
  );
}
