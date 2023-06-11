import { conform, useForm } from "@conform-to/react";
import { VALIDATION_UNDEFINED } from "@conform-to/react/hooks";
import { getFieldsetConstraint, parse } from "@conform-to/zod";
import type { ActionArgs, LoaderArgs } from "@remix-run/node";
import { redirect, typedjson, useTypedActionData } from "remix-typedjson";
import { z } from "zod";

import ConformForm from "~/components/ConformForm";
import ConformInput from "~/components/ConformInput";
import ConformSelect from "~/components/ConformSelect";
import { MinPasswordLength } from "~/models/user";
import { createUser, getUserByEmail } from "~/models/user.server";
import { UserRole } from "~/prisma-client";
import { requireAdminUser } from "~/session.server";
import { addSubmissionError } from "~/utils";

function createSchema(
  // The constraints parameter is optional as it is only implemented on the server
  constraints: {
    isEmailUnique?: (email: string) => Promise<boolean>;
  } = {}
) {
  return z
    .object({
      email: z
        .string()
        .regex(/.+@.+\..+/)
        .superRefine((email, context_) => {
          if (constraints.isEmailUnique === undefined) {
            // Validate only if the constraint is defined

            context_.addIssue({
              code: z.ZodIssueCode.custom,

              message: VALIDATION_UNDEFINED,
            });
          } else {
            // Tell zod this is an async validation by returning the promise

            return constraints.isEmailUnique(email).then((isUnique) => {
              if (isUnique) {
                return;
              }

              context_.addIssue({
                code: z.ZodIssueCode.custom,

                message: "A user already exists with this email",
              });
            });
          }
        }),
      name: z.string().min(1),
      role: z.nativeEnum(UserRole),
      password: z.string().min(MinPasswordLength),
      confirmPassword: z.string().min(MinPasswordLength),
    })
    .refine((argument) => argument.password === argument.confirmPassword, {
      message: "Password doesn't match",
      path: ["confirmPassword"],
    });
}

export async function loader({ request }: LoaderArgs) {
  await requireAdminUser(request);
  return null;
}

export async function action({ request }: ActionArgs) {
  await requireAdminUser(request);

  const formData = await request.formData();
  const submission = await parse(formData, {
    async: true,
    schema: createSchema({
      isEmailUnique: async (email) => {
        const existingUser = await getUserByEmail(email);
        return existingUser === null;
      },
    }),
  });

  if (!submission.value || submission.intent !== "submit") {
    return typedjson({
      ...submission,
      payload: {
        ...submission.payload,
        password: "",
      },
    });
  }

  try {
    const user = await createUser(
      {
        email: submission.value.email,
        name: submission.value.name,
        role: submission.value.role,
      },
      submission.value.password
    );
    return redirect(`/admin/users/${user.id}`);
  } catch (error) {
    return typedjson(addSubmissionError({ submission, error }));
  }
}

export default function NewUser() {
  const lastSubmission = useTypedActionData<typeof action>() ?? undefined;

  const schema = createSchema();

  const [form, fields] = useForm({
    initialReport: "onBlur",
    lastSubmission,
    defaultValue: { role: UserRole.User },
    constraint: getFieldsetConstraint(schema),
    onValidate({ formData }) {
      return parse(formData, { schema });
    },
  });

  return (
    <div>
      <h2>New user</h2>
      <ConformForm form={form} method="post">
        <ConformInput
          label="Email"
          input={conform.input(fields.email, { type: "email" })}
          error={fields.email.error}
          autoComplete="email"
        />
        <ConformInput
          label="Name"
          input={conform.input(fields.name)}
          error={fields.name.error}
          autoComplete="name"
        />
        <ConformSelect
          label="Role"
          select={conform.select(fields.role)}
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
          input={conform.input(fields.password, {
            type: "password",
          })}
          error={fields.password.error}
          autoComplete="new-password"
        />
        <ConformInput
          label="Confirm password"
          input={conform.input(fields.confirmPassword, {
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
