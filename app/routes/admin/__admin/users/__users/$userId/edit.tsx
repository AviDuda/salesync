import { UserRole } from "~/prisma-client";
import type { Params } from "@remix-run/react";
import { Form } from "@remix-run/react";
import type { ActionArgs, LoaderArgs } from "@remix-run/server-runtime";
import { redirect } from "@remix-run/server-runtime";
import invariant from "tiny-invariant";
import { z } from "zod";
import { zfd } from "zod-form-data";
import { prisma } from "~/db.server";
import { MinPasswordLength } from "~/models/user";
import { updateUser } from "~/models/user.server";
import { requireUser } from "~/session.server";
import type { PageHandle } from "~/types/remix";
import { useMatchesData, useUser } from "~/utils";
import type { Loader } from "../$userId";

enum Intent {
  Save = "save",
  Remove = "remove",
}

async function checkPermissions(request: Request, params: Params<string>) {
  const user = await requireUser(request);
  invariant(params.userId, "Invalid user ID");
  if (user.role === UserRole.Admin || user.id === params.userId) {
    return { currentUser: user };
  }
  throw new Response(null, { status: 403 });
}

export async function action({ request, params }: ActionArgs) {
  const { currentUser } = await checkPermissions(request, params);

  const schema = z.union([
    zfd.formData({
      intent: zfd.text(z.literal(Intent.Save)),
      email: zfd.text(),
      name: zfd.text(),
      role: zfd.text(z.nativeEnum(UserRole).optional()),
      new_password: zfd.text(z.string().min(MinPasswordLength).optional()),
    }),
    zfd.formData({
      intent: zfd.text(z.literal(Intent.Remove)),
    }),
  ]);

  const formData = await request.formData();
  const data = schema.parse(formData);

  if (data.intent === Intent.Save) {
    await updateUser(
      { id: params.userId },
      {
        email: data.email,
        name: data.name,
        role: currentUser.role === UserRole.Admin ? data.role : undefined,
      },
      data.new_password
    );

    return redirect(`/admin/users/${params.userId}`);
  } else if (data.intent === Intent.Remove) {
    if (currentUser.role !== UserRole.Admin) {
      throw new Response(null, { status: 403 });
    }
    await prisma.user.delete({ where: { id: params.userId } });
    return redirect(`/admin/users`);
  }

  throw new Error("Invalid intent");
}

export async function loader({ request, params }: LoaderArgs) {
  await checkPermissions(request, params);
  return null;
}

export const handle: PageHandle = { breadcrumb: () => "Edit user" };

export default function UserEdit() {
  const data = useMatchesData<Loader>(
    "routes/admin/__admin/users/__users/$userId"
  );
  invariant(data, "Missing user data");

  const user = useUser();

  return (
    <div>
      <h3>Edit user</h3>
      <Form method="post" className="flex flex-col gap-4">
        <div className="grid grid-cols-[auto_auto] gap-4 w-fit">
          <label htmlFor="email">Email</label>
          <input
            type="text"
            name="email"
            id="email"
            defaultValue={data.user.email}
          />
          <label htmlFor="name">Name</label>
          <input
            type="text"
            name="name"
            id="name"
            defaultValue={data.user.name}
          />
          <label htmlFor="role">Role</label>
          <select
            name="role"
            id="role"
            defaultValue={data.user.role}
            disabled={user.role !== UserRole.Admin}
          >
            {Object.entries(UserRole).map(([key, name]) => (
              <option key={key} value={key}>
                {name}
              </option>
            ))}
          </select>
          <label htmlFor="new_password">New password</label>
          <input
            type="password"
            name="new_password"
            id="new_password"
            autoComplete="new-password"
          />
        </div>
        <div className="flex gap-2">
          <button
            type="submit"
            name="intent"
            value={Intent.Save}
            className="button-primary"
          >
            Save
          </button>
          {user.role === UserRole.Admin && (
            <button
              type="submit"
              name="intent"
              value={Intent.Remove}
              className="button-destructive"
            >
              X
            </button>
          )}
        </div>
      </Form>
    </div>
  );
}
