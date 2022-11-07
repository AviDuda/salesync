import { Link, Outlet, useLoaderData } from "@remix-run/react";
import type { LoaderArgs, SerializeFrom } from "@remix-run/server-runtime";
import { json } from "@remix-run/server-runtime";
import invariant from "tiny-invariant";
import { prisma } from "~/db.server";
import { requireAdminUser } from "~/session.server";
import type { PageHandle } from "~/types/remix";
import { nl2br } from "~/utils";

export async function loader({ request, params }: LoaderArgs) {
  await requireAdminUser(request);
  invariant(params.platformId, "Invalid platform ID");
  const platform = await prisma.platform.findUnique({
    where: { id: params.platformId },
    include: { appPlatforms: { include: { app: true, links: true } } },
  });
  invariant(platform, "Platform not found");

  return json({ platform });
}

export type Loader = SerializeFrom<typeof loader>;

export const handle: PageHandle = {
  breadcrumb: ({ data }) => data?.platform?.name,
};

export default function Platform() {
  const data = useLoaderData<typeof loader>();

  return (
    <div>
      <h2>{data.platform.name}</h2>
      <Outlet />
      <h3>Basic info</h3>
      {data.platform.appPlatforms.length} apps
      {data.platform.url && (
        <div>
          <h3>Platform URL</h3>
          <a href={data.platform.url} target="blank" rel="noopener noreferrer">
            {data.platform.url}
          </a>
        </div>
      )}
      {data.platform.comment && (
        <div>
          <p>Comment:</p>
          <div className="bg-secondary-section p-2 w-fit">
            {nl2br(data.platform.comment)}
          </div>
        </div>
      )}
      <h3>App list</h3>
      <table className="table-auto w-full">
        <thead>
          <tr>
            <th>App</th>
            <th>Release state</th>
            <th>Early Access</th>
            <th>Free to play</th>
            <th>Links</th>
            <th>Comment</th>
          </tr>
        </thead>
        <tbody>
          {data.platform.appPlatforms.map((appPlatform) => (
            <tr key={appPlatform.id}>
              <td>
                <Link to={`/admin/apps/${appPlatform.appId}`}>
                  {appPlatform.app.name}
                </Link>
              </td>
              <td>{appPlatform.releaseState}</td>
              <td>
                <input
                  type="checkbox"
                  defaultChecked={appPlatform.isEarlyAccess}
                  disabled
                />
              </td>
              <td>
                <input
                  type="checkbox"
                  defaultChecked={appPlatform.isFreeToPlay}
                  disabled
                />
              </td>
              <td>
                <ul>
                  {appPlatform.links.map((link) => (
                    <li key={link.id}>
                      <span>{link.type}: </span>
                      <a
                        href={link.url}
                        rel="noopener noreferrer"
                        target="_blank"
                        title={link.comment ?? undefined}
                      >
                        {link.title}
                      </a>
                    </li>
                  ))}
                </ul>
              </td>
              <td>
                {appPlatform.comment && (
                  <span title={appPlatform.comment}>has comment</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
