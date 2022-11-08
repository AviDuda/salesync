import type { App, AppPlatform, Platform, Prisma } from "~/prisma-client";
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
import { getSession, requireAdminUser, sessionStorage } from "~/session.server";
import { GroupBy } from "./index";

export enum Intent {
  SetAppData = "set-app-data",
  Save = "save",
}

const sessionFlashKey = "event_platforms_app_data";

const appDataItemSchema = z.object({
  appId: zfd.text(),
  /** Available only when grouping by platform in the previous step */
  appPlatformId: zfd.text(z.string().optional()),
});
const appDataSchema = z.object({
  groupBy: zfd.text(z.nativeEnum(GroupBy)),
  appData: zfd.repeatableOfType(zfd.json(appDataItemSchema)),
});
type AppDataSchema = z.infer<typeof appDataSchema>;

export async function action({ request, params }: ActionArgs) {
  await requireAdminUser(request);
  const eventId = params.eventId;
  invariant(eventId, "Invalid event ID");

  const statusSchema = z.nativeEnum(EventAppPlatformStatus);

  const schema = z.union([
    zfd.formData(
      appDataSchema.merge(
        z.object({
          intent: zfd.text(z.literal(Intent.SetAppData)),
        })
      )
    ),
    zfd
      .formData({
        intent: zfd.text(z.literal(Intent.Save)),
        apps: zfd.repeatableOfType(
          z.object({
            appPlatforms: zfd.repeatableOfType(
              z.object({
                appPlatformId: zfd.text(),
                checked: zfd.text(z.literal("on").optional()),
                status: zfd.text(statusSchema.optional()),
                comment: zfd.text(z.string().optional()),
              })
            ),
          })
        ),
      })
      .superRefine((arg, ctx) => {
        const checkedPlatformCount = arg.apps.reduce((sum, app) => {
          const checkedAppPlatforms = app.appPlatforms.filter(
            (appPlatform) => appPlatform.checked === "on"
          ).length;
          return sum + checkedAppPlatforms;
        }, 0);
        if (checkedPlatformCount === 0) {
          ctx.addIssue({
            code: "custom",
            message: "No platforms selected",
            path: ["appPlatforms"],
          });
        }

        arg.apps.forEach((app, appIndex) => {
          app.appPlatforms.forEach((appPlatform, appPlatformIndex) => {
            if (appPlatform.checked !== "on") {
              return;
            }

            // Check that a checked app platform has status set
            const parsedStatus = statusSchema.safeParse(appPlatform.status);
            if (!parsedStatus.success) {
              parsedStatus.error.issues.forEach((issue) => {
                ctx.addIssue({
                  ...issue,
                  path: [
                    `apps[${appIndex}].appPlatforms[${appPlatformIndex}].status`,
                  ],
                });
              });
            }
          });
        });

        return arg;
      }),
  ]);

  const formData = await request.formData();
  const data = schema.parse(formData);

  switch (data.intent) {
    case Intent.SetAppData: {
      if (data.appData.length === 0) {
        // Silently go back a step
        throw redirect(
          `/admin/events/${params.eventId}/apps/add-apps?groupBy=${data.groupBy}`
        );
      }

      // Store the data in session and use it in loader
      const session = await getSession(request);
      const sessionData: AppDataSchema = {
        groupBy: data.groupBy,
        appData: data.appData,
      };
      session.flash(sessionFlashKey, JSON.stringify(sessionData));
      return json(
        { appData: data.appData },
        {
          headers: {
            "Set-Cookie": await sessionStorage.commitSession(session),
          },
        }
      );
    }

    case Intent.Save: {
      const eventAppPlatforms: Array<Prisma.EventAppPlatformUncheckedCreateInput> =
        [];
      data.apps.forEach((app) => {
        app.appPlatforms.forEach((appPlatform) => {
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
            comment: appPlatform.comment ?? null,
          });
        });
      });

      await prisma.eventAppPlatform.createMany({
        data: eventAppPlatforms,
        skipDuplicates: true,
      });

      return redirect(`/admin/events/${eventId}/apps`);
    }

    default:
      throw new Error("Invalid intent");
  }
}

export async function loader({ request, params }: LoaderArgs) {
  await requireAdminUser(request);
  invariant(params.eventId, "Invalid event ID");

  // Try to parse app data we possibly got from action after the previous step
  const session = await getSession(request);
  const flashMessage = session.get(sessionFlashKey);
  const parsedAppData = zfd.json(appDataSchema).safeParse(flashMessage);

  if (!parsedAppData.success) {
    // Silently go back a step
    throw redirect(`/admin/events/${params.eventId}/apps/add-apps`);
  }

  let appIdsToSearch: Array<App["id"]> = [];
  let appPlatformIdsToSearch: Array<AppPlatform["id"]> = [];
  parsedAppData.data.appData.forEach((data) => {
    appIdsToSearch.push(data.appId);
    if (typeof data.appPlatformId !== "undefined") {
      appPlatformIdsToSearch.push(data.appPlatformId);
    }
  });

  const appPlatforms = await prisma.appPlatform.findMany({
    where: {
      appId: { in: appIdsToSearch },
      id:
        appPlatformIdsToSearch.length > 0
          ? { in: appPlatformIdsToSearch }
          : undefined,
      eventAppPlatforms: { none: { eventId: params.eventId } },
    },
    select: {
      id: true,
      platform: { select: { id: true, name: true } },
      app: { select: { id: true, name: true } },
    },
  });

  const appsMap = new Map<
    App["id"],
    {
      id: App["id"];
      name: App["name"];
      appPlatforms: Array<{
        id: AppPlatform["id"];
        platform: { id: Platform["id"]; name: Platform["name"] };
      }>;
    }
  >();

  appPlatforms.forEach((appPlatform) => {
    if (!appsMap.has(appPlatform.app.id)) {
      appsMap.set(appPlatform.app.id, {
        ...appPlatform.app,
        appPlatforms: [],
      });
    }

    const currentApp = appsMap.get(appPlatform.app.id)!;
    appsMap.set(appPlatform.app.id, {
      ...currentApp,
      appPlatforms: [
        ...currentApp.appPlatforms,
        { id: appPlatform.id, platform: appPlatform.platform },
      ],
    });
  });

  appsMap.forEach((app) => {
    appsMap.set(app.id, {
      ...app,
      appPlatforms: app.appPlatforms.sort((a, b) =>
        a.platform.name.localeCompare(b.platform.name)
      ),
    });
  });

  return json(
    { groupBy: parsedAppData.data.groupBy, apps: [...appsMap.values()] },
    {
      headers: {
        "Set-Cookie": await sessionStorage.commitSession(session),
      },
    }
  );
}

export default function SelectPlatforms() {
  const data = useLoaderData<typeof loader>();

  return (
    <div>
      <Form method="post">
        <p>Select platforms</p>
        <div className="flex flex-col gap-8">
          {data.apps.map((app, appIndex) => (
            <div key={app.id} className="w-fit">
              <Link to={`/admin/apps/${app.id}`}>{app.name}</Link>
              <div className="flex flex-wrap gap-4">
                {app.appPlatforms.map((appPlatform, appPlatformIndex) => {
                  const name = `apps[${appIndex}].appPlatforms[${appPlatformIndex}]`;
                  const id = `apps_${appIndex}_appPlatforms_${appPlatformIndex}`;
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
                          defaultChecked={data.groupBy === GroupBy.Platform}
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
            </div>
          ))}
        </div>
        <button
          type="submit"
          name="intent"
          value={Intent.Save}
          className="button-primary mt-4"
        >
          Add apps
        </button>
      </Form>
    </div>
  );
}
