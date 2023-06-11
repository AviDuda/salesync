import { cssBundleHref } from "@remix-run/css-bundle";
import type { LinksFunction, LoaderArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import {
  Links,
  LiveReload,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  useLoaderData,
  useMatches,
} from "@remix-run/react";

import { PageTitle } from "~/config";
import {
  getSession,
  getSessionGlobalMessage,
  getUser,
  setHeadersForSessionCommit,
} from "~/session.server";
import globalStylesheet from "~/styles/global.css";
import type { PageHandle } from "~/types/remix";

export const links: LinksFunction = () => {
  return [
    { rel: "stylesheet", href: globalStylesheet },
    ...(cssBundleHref ? [{ rel: "stylesheet", href: cssBundleHref }] : []),
  ];
};

export const handle: PageHandle = { breadcrumb: () => PageTitle };

export async function loader({ request }: LoaderArgs) {
  const session = await getSession(request);
  const globalMessage = await getSessionGlobalMessage(request);

  return json(
    {
      user: await getUser(request),
      globalMessage,
    },
    await setHeadersForSessionCommit(session)
  );
}

export default function App() {
  const data = useLoaderData<typeof loader>();
  const matches = useMatches();

  const titles = matches
    .filter(
      (match) =>
        match.handle !== undefined &&
        (typeof match.handle.breadcrumb === "function" ||
          typeof match.handle.title === "function")
    )
    .map((match) => {
      const breadcrumb =
        (match.handle as PageHandle).breadcrumb?.(match) ??
        (match.handle as PageHandle).title?.(match);
      return breadcrumb;
    })
    .filter(
      (breadcrumb): breadcrumb is string => typeof breadcrumb === "string"
    )
    .reverse();

  return (
    <html lang="en" className="h-full bg-zinc-900 text-white">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width,initial-scale=1" />
        <title>{titles.length > 0 ? titles.join(" | ") : PageTitle}</title>
        <Meta />
        <Links />
      </head>
      <body className="flex h-screen flex-col overflow-hidden">
        <header className="w-full px-2 py-4 text-center">
          <h1>{PageTitle}</h1>
        </header>
        {data.globalMessage && (
          <div className="mb-4 w-full bg-blue-100 px-4 py-2">
            {data.globalMessage}
          </div>
        )}
        <div className="mb-4 grow overflow-auto">
          <Outlet />
        </div>
        <ScrollRestoration />
        <Scripts />
        <LiveReload />
      </body>
    </html>
  );
}
