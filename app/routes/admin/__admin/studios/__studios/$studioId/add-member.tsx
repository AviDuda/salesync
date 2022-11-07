import { Form, useLoaderData } from "@remix-run/react";
import type { ActionArgs, LoaderArgs } from "@remix-run/server-runtime";
import { json } from "@remix-run/server-runtime";
import { redirect } from "@remix-run/server-runtime";
import invariant from "tiny-invariant";
import { z } from "zod";
import { zfd } from "zod-form-data";
import { prisma } from "~/db.server";
import { requireAdminUser } from "~/session.server";
import type { PageHandle } from "~/types/remix";

export async function action({ request, params }: ActionArgs) {
  await requireAdminUser(request);
  invariant(params.studioId, "Invalid studio ID");

  const schema = zfd.formData({
    userId: zfd.text(),
    position: zfd.text(z.string().optional()),
    comment: zfd.text(z.string().optional()),
    setAsMainContact: zfd.text(z.literal("on").optional()),
  });

  const formData = await request.formData();
  const data = schema.parse(formData);

  const member = await prisma.studioMember.create({
    data: {
      studioId: params.studioId,
      userId: data.userId,
      position: data.position ?? null,
      comment: data.comment ?? null,
    },
    select: { id: true },
  });

  if (data.setAsMainContact === "on") {
    await prisma.studio.update({
      where: { id: params.studioId },
      data: { mainContactId: member.id },
    });
  }

  return redirect(`/admin/studios/${params.studioId}`);
}

export async function loader({ request, params }: LoaderArgs) {
  await requireAdminUser(request);
  invariant(params.studioId, "Invalid studio ID");

  const studio = await prisma.studio.findFirstOrThrow({
    where: { id: params.studioId },
    select: {
      name: true,
      mainContact: true,
      members: { include: { user: true } },
    },
  });

  const currentStudioMembers = studio.members.map((member) => member.userId);

  const users = await prisma.user.findMany({
    where: { id: { notIn: currentStudioMembers } },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  return json({ studio, users });
}

export const handle: PageHandle = { breadcrumb: () => "Add member" };

export default function AddMemberToStudio() {
  const data = useLoaderData<typeof loader>();

  return (
    <div>
      <h3>Add member to studio</h3>
      <Form method="post">
        <div className="grid grid-cols-2 gap-2 w-fit">
          <label htmlFor="userId">User</label>
          <select name="userId" id="userId">
            {data.users.map((user) => (
              <option key={user.id} value={user.id}>
                {user.name}
              </option>
            ))}
          </select>
          <label htmlFor="position">Position</label>
          <input type="text" name="position" id="position" />
          <label htmlFor="comment">Comment</label>
          <textarea name="comment" id="comment" />
          <div className="flex gap-2 col-span-2">
            <input
              type="checkbox"
              name="setAsMainContact"
              id="setAsMainContact"
            />
            <label htmlFor="setAsMainContact">
              Set as main contact for studio
            </label>
          </div>
        </div>
        <button type="submit" className="button-primary">
          Add member
        </button>
      </Form>
    </div>
  );
}
