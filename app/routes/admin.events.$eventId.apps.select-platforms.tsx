import { Form, Link, useActionData } from "@remix-run/react";
import type { ActionArgs, LoaderArgs } from "@remix-run/server-runtime";
import { redirect } from "@remix-run/server-runtime";
import { json } from "@remix-run/server-runtime";
import invariant from "tiny-invariant";
import { z } from "zod";
import { zfd } from "zod-form-data";

import { GroupBy } from "./admin.events.$eventId.add-apps._index";

import { prisma } from "~/database.server";
import { EventAppPlatformStatus } from "~/prisma-client";
import type { App, AppPlatform, Platform, Prisma } from "~/prisma-client";
import { requireAdminUser } from "~/session.server";

export enum Intent {
  SetAppData = "set-app-data",
  Save = "save",
}

const appDataItemSchema = z.object({
  appId: zfd.text(),
  /** Available only when grouping by platform in the previous step */
  appPlatformId: zfd.text(z.string().optional()),
});
const appDataSchema = z.object({
  groupBy: zfd.text(z.nativeEnum(GroupBy)),
  appData: zfd.repeatableOfType(zfd.json(appDataItemSchema)),
});

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
      .superRefine((argument, context_) => {
        let checkedPlatformCount = 0;
        for (const app of argument.apps) {
          const checkedAppPlatforms = app.appPlatforms.filter(
            (appPlatform) => appPlatform.checked === "on"
          ).length;
          checkedPlatformCount += checkedAppPlatforms;
        }
        if (checkedPlatformCount === 0) {
          context_.addIssue({
            code: "custom",
            message: "No platforms selected",
            path: ["appPlatforms"],
          });
        }

        for (const [appIndex, app] of argument.apps.entries()) {
          for (const [
            appPlatformIndex,
            appPlatform,
          ] of app.appPlatforms.entries()) {
            if (appPlatform.checked !== "on") {
              continue;
            }

            // Check that a checked app platform has status set
            const parsedStatus = statusSchema.safeParse(appPlatform.status);
            if (!parsedStatus.success) {
              for (const issue of parsedStatus.error.issues) {
                context_.addIssue({
                  ...issue,
                  path: [
                    `apps[${appIndex}].appPlatforms[${appPlatformIndex}].status`,
                  ],
                });
              }
            }
          }
        }

        return argument;
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

      let appIdsToSearch: Array<App["id"]> = [];
      let appPlatformIdsToSearch: Array<AppPlatform["id"]> = [];
      for (const app of data.appData) {
        appIdsToSearch.push(app.appId);
        if (app.appPlatformId !== undefined) {
          appPlatformIdsToSearch.push(app.appPlatformId);
        }
      }

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

      for (const appPlatform of appPlatforms) {
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
      }

      for (const [appId, app] of appsMap) {
        appsMap.set(appId, {
          ...app,
          appPlatforms: app.appPlatforms.sort((a, b) =>
            a.platform.name.localeCompare(b.platform.name)
          ),
        });
      }

      const apps = [...appsMap.values()].sort((a, b) =>
        a.name.localeCompare(b.name)
      );

      return json({ groupBy: data.groupBy, apps });
    }

    case Intent.Save: {
      const eventAppPlatforms: Array<Prisma.EventAppPlatformUncheckedCreateInput> =
        [];
      for (const app of data.apps) {
        for (const appPlatform of app.appPlatforms) {
          if (
            appPlatform.checked !== "on" ||
            appPlatform.status === undefined
          ) {
            continue;
          }

          eventAppPlatforms.push({
            appPlatformId: appPlatform.appPlatformId,
            eventId,
            status: appPlatform.status,
            comment: appPlatform.comment ?? null,
          });
        }
      }

      await prisma.eventAppPlatform.createMany({
        data: eventAppPlatforms,
        skipDuplicates: true,
      });

      return redirect(`/admin/events/${eventId}/apps`);
    }

    default: {
      throw new Error("Invalid intent");
    }
  }
}

export async function loader({ request, params }: LoaderArgs) {
  await requireAdminUser(request);
  invariant(params.eventId, "Invalid event ID");

  return null;
}

export default function SelectPlatforms() {
  const data = useActionData<typeof action>();

  if (!data?.apps) {
    return (
      <div>
        <p>You must select apps first!</p>
        <Link to="..">Go back</Link>
      </div>
    );
  }

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
                      <div className="w-fit bg-secondary-section px-4 py-1">
                        <div>
                          <label htmlFor={`${id}_status`}>Status</label>
                        </div>
                        <select
                          name={`${name}.status`}
                          id={`${id}_status`}
                          defaultValue={EventAppPlatformStatus.OK_Confirmed}
                        >
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
