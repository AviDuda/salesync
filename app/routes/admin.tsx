import { NavLink, Outlet, useFetcher, useMatches } from "@remix-run/react";
import type { PageHandle } from "~/types/remix";
import { useUser } from "~/utils";

export const handle: PageHandle = { breadcrumb: () => "Admin" };

export default function SignedInLayout() {
  const user = useUser();
  const matches = useMatches();

  const fetcherLogout = useFetcher();

  const breadcrumbs = matches
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
    .filter((breadcrumb): breadcrumb is JSX.Element => breadcrumb !== null)
    //@ts-expect-error
    .reduce((accu, elem) => {
      return accu === null ? [elem] : [...accu, "/", elem];
    }, null);

  return (
    <div className="h-full flex flex-col gap-4 overflow-y-hidden">
      <div className="flex gap-2 pl-4">{breadcrumbs}</div>
      <div className="flex flex-row-reverse justify-end gap-16 h-[calc(100%_-_40px)]">
        <main className="overflow-auto grow pr-4 pb-4">
          <Outlet />
        </main>
        <aside className="flex flex-col shrink-0 justify-between overflow-auto px-4">
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
            <p className="text-sm break-words italic">{user.name}</p>
            <fetcherLogout.Form action="/logout" method="post">
              <button
                type="submit"
                className="button-muted text-sm"
                disabled={fetcherLogout.state !== "idle"}
              >
                {fetcherLogout.state !== "idle" ? "Logging out..." : "Logout"}
              </button>
            </fetcherLogout.Form>
          </div>
        </aside>
      </div>
    </div>
  );
}
