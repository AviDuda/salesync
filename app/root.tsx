import type { LinksFunction, LoaderArgs, MetaFunction } from "@remix-run/node";
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

import {
  getSession,
  getUser,
  SessionFlashGlobalMessage,
  setHeadersForSessionCommit,
} from "./session.server";
import tailwindStylesheetUrl from "./styles/tailwind.css";
import globalStylesheetUrl from "./styles/global.css";
import type { PageHandle } from "./types/remix";
import { PageTitle } from "./config";

export const links: LinksFunction = () => {
  return [
    { rel: "stylesheet", href: tailwindStylesheetUrl },
    { rel: "stylesheet", href: globalStylesheetUrl },
  ];
};

export const meta: MetaFunction = () => ({
  charset: "utf-8",
  viewport: "width=device-width,initial-scale=1",
});

export const handle: PageHandle = { breadcrumb: () => PageTitle };

export async function loader({ request }: LoaderArgs) {
  const session = await getSession(request);
  const globalMessage = session.get(SessionFlashGlobalMessage);

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
        typeof match.handle !== "undefined" &&
        (typeof match.handle.breadcrumb === "function" ||
          typeof match.handle.title === "function")
    )
    .map((match) => {
      const breadcrumb =
        (match.handle as PageHandle).breadcrumb?.(match) ??
        (match.handle as PageHandle).title?.(match) ??
        null;
      return breadcrumb;
    })
    .filter((breadcrumb) => typeof breadcrumb === "string")
    .reverse();

  return (
    <html lang="en" className="h-full bg-zinc-900 text-white">
      <head>
        <title>{titles.length > 0 ? titles.join(" | ") : PageTitle}</title>
        <Meta />
        <Links />
      </head>
      <body className="h-screen overflow-hidden flex flex-col">
        <header className="w-full text-center py-4 px-2">
          <h1>{PageTitle}</h1>
        </header>
        {data.globalMessage && (
          <div className="w-full bg-blue-100 px-4 py-2 mb-4">
            {data.globalMessage}
          </div>
        )}
        <div className="grow overflow-auto mb-4">
          <Outlet />
        </div>
        <ScrollRestoration />
        <Scripts />
        <LiveReload />
      </body>
    </html>
  );
}
