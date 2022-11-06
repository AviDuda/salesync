import type { ActionArgs, LoaderArgs } from "@remix-run/node";
import { redirect } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useActionData } from "@remix-run/react";

import { requireAdminUser } from "~/session.server";

import { createUser, getUserByEmail } from "~/models/user.server";
import {
  conform,
  hasError,
  parse,
  shouldValidate,
  useFieldset,
  useForm,
} from "@conform-to/react";
import { formatError, validate } from "@conform-to/zod";
import { z } from "zod";
import ConformInput from "~/components/ConformInput";
import { UserRole } from "~/prisma-client";
import ConformSelect from "~/components/ConformSelect";
import ConformForm from "~/components/ConformForm";
import type { PageHandle } from "~/types/remix";
import { MinPasswordLength } from "~/models/user";

const schema = z
  .object({
    email: z.string().regex(/.+@.+\..+/),
    name: z.string().min(1),
    role: z.nativeEnum(UserRole),
    password: z.string().min(MinPasswordLength),
    confirmPassword: z.string().min(MinPasswordLength),
  })
  .refine((arg) => arg.password === arg.confirmPassword, {
    message: "Password doesn't match",
    path: ["confirmPassword"],
  });
type Schema = z.infer<typeof schema>;

export async function loader({ request }: LoaderArgs) {
  await requireAdminUser(request);
  return null;
}

export async function action({ request }: ActionArgs) {
  await requireAdminUser(request);

  const formData = await request.formData();
  const submission = parse<Schema>(formData);

  try {
    switch (submission.type) {
      case "validate":
      case "submit": {
        const data = await schema
          .refine(
            async ({ email }) => {
              if (!shouldValidate(submission, "email")) {
                return true;
              }

              const existingUser = await getUserByEmail(email);
              return existingUser === null;
            },
            {
              message: "A user already exists with this email",
              path: ["email"],
            }
          )
          .parseAsync(submission.value);

        await new Promise((resolve) => setTimeout(resolve, 1000));

        if (submission.type === "submit") {
          const user = await createUser(
            { email: data.email, name: data.name, role: data.role },
            data.password
          );

          return redirect(`/admin/users/${user.id}`);
        }
      }
    }
  } catch (error) {
    submission.error.push(...formatError(error));
  }

  delete submission.value.password;
  return json(submission);
}

export const handle: PageHandle = { breadcrumb: () => "New user" };

export default function NewUser() {
  const state = useActionData<typeof action>();

  const form = useForm<Schema>({
    mode: "server-validation",
    initialReport: "onBlur",
    state,
    defaultValue: { role: UserRole.User },
    onValidate({ formData }) {
      return validate(formData, schema);
    },
    onSubmit(event, { submission }) {
      /**
       * Let the submission passthrough if it is validating
       * the email field and no error found on the client
       */

      if (
        submission.type === "validate" &&
        (submission.intent !== "email" || hasError(submission.error, "email"))
      ) {
        event.preventDefault();
      }
    },
  });
  const fields = useFieldset(form.ref, form.config);

  return (
    <div>
      <h2>New user</h2>
      <ConformForm form={form} method="post">
        <ConformInput
          label="Email"
          input={conform.input(fields.email.config, { type: "email" })}
          error={fields.email.error}
          autoComplete="email"
        />
        <ConformInput
          label="Name"
          input={conform.input(fields.name.config)}
          error={fields.name.error}
          autoComplete="name"
        />
        <ConformSelect
          label="Role"
          select={conform.select(fields.role.config)}
          error={fields.role.error}
        >
          {Object.entries(UserRole).map(([value, name]) => (
            <option key={value} value={value}>
              {name}
            </option>
          ))}
        </ConformSelect>
        <ConformInput
          label="Password"
          input={conform.input(fields.password.config, {
            type: "password",
          })}
          error={fields.password.error}
          autoComplete="new-password"
        />
        <ConformInput
          label="Confirm password"
          input={conform.input(fields.confirmPassword.config, {
            type: "password",
          })}
          error={fields.confirmPassword.error}
          autoComplete="new-password"
        />
        <input type="submit" value="Save" className="button-primary mt-4" />
      </ConformForm>
    </div>
  );
}
