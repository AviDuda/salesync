import type { LoaderArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { Link, useLoaderData } from "@remix-run/react";
import { prisma } from "~/db.server";
import { requireUserId } from "~/session.server";

export async function loader({ request }: LoaderArgs) {
  await requireUserId(request);
  const studios = await prisma.studio.findMany({
    select: {
      _count: { select: { apps: true, members: true } },
      id: true,
      name: true,
    },
    orderBy: { name: "asc" },
  });
  return json({ studios });
}

export default function Studios() {
  const data = useLoaderData<typeof loader>();

  return (
    <div>
      <h2>Studios</h2>
      <Link to="new">New studio</Link>
      {data.studios.map((studio) => (
        <div key={studio.id}>
          <h3>
            <Link to={studio.id}>{studio.name}</Link>
          </h3>
          <p>
            <em>
              {studio._count.apps} apps, {studio._count.members} members
            </em>
          </p>
        </div>
      ))}
    </div>
  );
}
