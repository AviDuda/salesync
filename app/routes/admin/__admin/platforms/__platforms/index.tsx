import type { LoaderArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { Link, useLoaderData } from "@remix-run/react";
import { omit } from "lodash";
import { prisma } from "~/db.server";
import { requireAdminUser } from "~/session.server";

export async function loader({ request }: LoaderArgs) {
  await requireAdminUser(request);
  const platforms = (
    await prisma.platform.findMany({
      include: {
        appPlatforms: { distinct: ["appId"], select: { appId: true } },
      },
      orderBy: { name: "asc" },
    })
  ).map((platform) => {
    return {
      appCount: platform.appPlatforms.reduce((prev) => (prev += 1), 0),
      ...omit(platform, "appPlatforms"),
    };
  });
  return json({ platforms });
}

export default function Platforms() {
  const data = useLoaderData<typeof loader>();

  return (
    <div>
      <h2>Platforms</h2>
      <Link to="new">New platform</Link>
      {data.platforms.map((platform) => (
        <div key={platform.id}>
          <h3>
            <Link to={platform.id}>{platform.name}</Link>
          </h3>
          <p>
            <em>{platform.appCount} apps</em>
          </p>
        </div>
      ))}
    </div>
  );
}
