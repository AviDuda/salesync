import {
  isRouteErrorResponse,
  NavLink,
  Outlet,
  useFetcher,
  useMatches,
  useRouteError,
} from "@remix-run/react";
import type { LoaderArgs } from "@remix-run/server-runtime";
import type { ReactNode } from "react";
import { z } from "zod";

import { requireAdminUser } from "~/session.server";
import type { PageHandle } from "~/types/remix";
import { jsxJoin, useUser } from "~/utils";

export async function loader({ request }: LoaderArgs) {
  await requireAdminUser(request);
  return null;
}

export const handle: PageHandle = { breadcrumb: () => "Admin" };

export default function AdminLayout() {
  const user = useUser();
  const matches = useMatches();

  const fetcherLogout = useFetcher();

  const breadcrumbs = jsxJoin(
    matches
      .filter((match) => typeof match.handle?.breadcrumb === "function")
      .map((match, index) => {
        const breadcrumb = (match.handle as PageHandle).breadcrumb!(match);
        if (typeof breadcrumb !== "string") {
          return null;
        }
        return (
          <NavLink key={index} to={match.pathname}>
            {breadcrumb}
          </NavLink>
        );
      })
      .filter((breadcrumb): breadcrumb is JSX.Element => breadcrumb !== null),
    "/"
  );

  return (
    <div className="flex h-full flex-col gap-4 overflow-y-hidden">
      <div className="flex gap-2 pl-4">{breadcrumbs}</div>
      <div className="flex h-[calc(100%_-_40px)] flex-row-reverse justify-end gap-16">
        <main className="grow overflow-auto pb-4 pr-4">
          <Outlet />
        </main>
        <aside className="flex shrink-0 flex-col justify-between overflow-auto px-4">
          <ul>
            <li>
              <NavLink to=".">Dashboard</NavLink>
            </li>
            <li>
              <NavLink to="events">Events</NavLink>
            </li>
            <li>
              <NavLink to="apps">Apps</NavLink>
            </li>
            <li>
              <NavLink to="platforms">Platforms</NavLink>
            </li>
            <li>
              <NavLink to="studios">Studios</NavLink>
            </li>
            <li>
              <NavLink to="users">Users</NavLink>
            </li>
          </ul>
          <div>
            <p className="break-words text-sm italic">{user.name}</p>
            <fetcherLogout.Form action="/admin/logout" method="post">
              <button
                type="submit"
                className="button-muted text-sm"
                disabled={fetcherLogout.state !== "idle"}
              >
                {fetcherLogout.state === "idle" ? "Logout" : "Logging out..."}
              </button>
            </fetcherLogout.Form>
          </div>
        </aside>
      </div>
    </div>
  );
}

export function ErrorBoundary() {
  const error = useRouteError();

  if (isRouteErrorResponse(error)) {
    return (
      <div className="mx-4 max-w-full bg-error px-4 py-2">
        <h1>Error</h1>
        <p>Status: {error.status}</p>
        <p>Message: {error.data.message}</p>
        <details>
          <summary>Toggle data</summary>
          <pre className="overflow-auto pb-4 text-sm">
            {/* eslint-disable-next-line @typescript-eslint/no-magic-numbers -- stringified JSON */}
            <code>{JSON.stringify(error.data, undefined, 2)}</code>
          </pre>
        </details>
      </div>
    );
  }

  let errorMessage: ReactNode = "Unknown error";
  try {
    if (!(error instanceof Error)) {
      throw new TypeError("Not an error");
    }

    const zodError = new z.ZodError(JSON.parse(error.message));
    errorMessage = (
      <div>
        <h2>Failed to parse the form</h2>
        <ul>
          {zodError.issues.map((issue, index) => (
            <li key={index}>
              Field {issue.path.join(" / ")}: {issue.code}: {issue.message}
            </li>
          ))}
        </ul>
      </div>
    );
  } catch {}

  return (
    <div className="mx-4 max-w-full bg-error px-4 py-2">
      <h1>Error</h1>
      {errorMessage}
      {error instanceof Error && error.stack && (
        <details className="pt-2">
          <summary>Toggle stack trace</summary>
          <pre className="overflow-auto pb-4 text-sm">{error.stack}</pre>
        </details>
      )}
    </div>
  );
}
