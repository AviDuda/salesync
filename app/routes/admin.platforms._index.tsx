import type { LoaderArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { Link, useLoaderData } from "@remix-run/react";
import { omit } from "lodash";

import { prisma } from "~/database.server";
import { requireAdminUser } from "~/session.server";

export async function loader({ request }: LoaderArgs) {
  await requireAdminUser(request);
  const platformsResult = await prisma.platform.findMany({
    include: {
      appPlatforms: { distinct: ["appId"], select: { appId: true } },
    },
    orderBy: { name: "asc" },
  });

  const platforms = platformsResult.map((platform) => {
    let appCount = 0;
    for (const _appPlatform of platform.appPlatforms) {
      appCount += 1;
    }
    return {
      appCount,
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
