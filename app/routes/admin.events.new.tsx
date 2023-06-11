import { conform, useForm } from "@conform-to/react";
import { getFieldsetConstraint, parse } from "@conform-to/zod";
import { Form, useActionData } from "@remix-run/react";
import type { ActionArgs, LoaderArgs } from "@remix-run/server-runtime";
import { json } from "@remix-run/server-runtime";
import { isBefore } from "date-fns";
import { redirect } from "remix-typedjson";
import { z } from "zod";

import ConformInput from "~/components/ConformInput";
import ConformSelect from "~/components/ConformSelect";
import EmptyOption from "~/components/EmptyOption";
import { prisma } from "~/database.server";
import { EventVisibility } from "~/prisma-client";
import { requireAdminUser } from "~/session.server";
import { addSubmissionError } from "~/utils";
import { preprocessDate } from "~/zod";

const schema = z
  .object({
    name: z.string().min(1),
    runningFrom: preprocessDate(),
    runningTo: preprocessDate(),
    visibility: z.nativeEnum(EventVisibility),
  })
  .superRefine((argument, context) => {
    if (isBefore(argument.runningTo, argument.runningFrom)) {
      context.addIssue({
        code: "invalid_date",
        message: "Must be after running from",
        path: ["runningTo"],
      });
    }
    return argument;
  });

export async function action({ request }: ActionArgs) {
  await requireAdminUser(request);

  const formData = await request.formData();
  const submission = parse(formData, { schema });

  if (!submission.value || submission.intent !== "submit") {
    return json(submission);
  }

  try {
    const data = submission.value;
    const event = await prisma.event.create({
      data: {
        name: data.name,
        runningFrom: data.runningFrom,
        runningTo: data.runningTo,
        visibility: data.visibility,
      },
    });
    throw redirect(`/admin/events/${event.id}`);
  } catch (error) {
    return json(addSubmissionError({ submission, error }));
  }
}

export async function loader({ request }: LoaderArgs) {
  await requireAdminUser(request);
  return null;
}

export default function NewEvent() {
  const lastSubmission = useActionData<typeof action>();

  const [form, fields] = useForm({
    initialReport: "onBlur",
    lastSubmission,
    constraint: getFieldsetConstraint(schema),
    onValidate({ formData }) {
      return parse(formData, { schema });
    },
  });

  return (
    <div>
      <h3>New event</h3>
      <Form method="post" {...form.props}>
        <ConformInput
          label="Event name"
          input={conform.input(fields.name)}
          error={fields.name.error}
        />
        <ConformInput
          label="Running from (local)"
          input={conform.input(fields.runningFrom, {
            type: "datetime-local",
          })}
          error={fields.runningFrom.error}
        />
        <ConformInput
          label="Running to (local)"
          input={conform.input(fields.runningTo, {
            type: "datetime-local",
          })}
          error={fields.runningTo.error}
        />
        <ConformSelect
          label="Event visibility"
          select={conform.select(fields.visibility)}
          error={fields.visibility.error}
        >
          <EmptyOption />
          {Object.entries(EventVisibility).map(([key, name]) => (
            <option key={key} value={key}>
              {name}
            </option>
          ))}
        </ConformSelect>
        <input type="submit" value="Save" className="button-primary mt-2" />
      </Form>
    </div>
  );
}
