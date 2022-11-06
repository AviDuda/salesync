import {
  conform,
  hasError,
  parse,
  useFieldset,
  useForm,
} from "@conform-to/react";
import { formatError, validate } from "@conform-to/zod";
import { EventVisibility } from "~/prisma-client";
import { Form, useActionData } from "@remix-run/react";
import type { ActionArgs, LoaderArgs } from "@remix-run/server-runtime";
import { json } from "@remix-run/server-runtime";
import { isBefore } from "date-fns";
import { redirect, typedjson, useTypedLoaderData } from "remix-typedjson";
import invariant from "tiny-invariant";
import { z } from "zod";
import ConformInput from "~/components/ConformInput";
import ConformSelect from "~/components/ConformSelect";
import EmptyOption from "~/components/EmptyOption";
import { prisma } from "~/db.server";
import { requireAdminUser } from "~/session.server";
import type { PageHandle } from "~/types/remix";
import { datetimeToDatetimeLocalInput } from "~/utils";
import { preprocessDate } from "~/zod";

const schema = z
  .object({
    name: z.string().min(1),
    runningFrom: preprocessDate(),
    runningTo: preprocessDate(),
    visibility: z.nativeEnum(EventVisibility),
  })
  .superRefine((arg, ctx) => {
    if (isBefore(arg.runningTo, arg.runningFrom)) {
      ctx.addIssue({
        code: "invalid_date",
        message: "Must be after running from",
        path: ["runningTo"],
      });
    }
    return arg;
  });
type Schema = z.infer<typeof schema>;

export async function action({ request, params }: ActionArgs) {
  await requireAdminUser(request);
  invariant(params.eventId, "Invalid event ID");

  const formData = await request.formData();
  const submission = parse<Schema>(formData);

  try {
    const data = schema.parse(submission.value);
    if (!hasError(submission.error)) {
      await prisma.event.update({
        where: { id: params.eventId },
        data: {
          name: data.name,
          runningFrom: data.runningFrom,
          runningTo: data.runningTo,
          visibility: data.visibility,
        },
      });
      return redirect(`/admin/events/${params.eventId}`);
    }
  } catch (error) {
    submission.error.push(...formatError(error));
  }

  return json(submission);
}

export async function loader({ request, params }: LoaderArgs) {
  await requireAdminUser(request);
  invariant(params.eventId, "Invalid event ID");

  const event = await prisma.event.findUnique({
    where: { id: params.eventId },
  });
  invariant(event, "Event not found");

  return typedjson({ event });
}

export const handle: PageHandle = { breadcrumb: () => "Edit event" };

export default function EditEvent() {
  const state = useActionData<typeof action>();
  const { event } = useTypedLoaderData<typeof loader>();

  const form = useForm<Schema>({
    initialReport: "onBlur",
    state,
    defaultValue: {
      name: event.name,
      runningFrom: datetimeToDatetimeLocalInput(event.runningFrom),
      runningTo: datetimeToDatetimeLocalInput(event.runningTo),
      visibility: event.visibility,
    },
    onValidate({ formData }) {
      return validate(formData, schema);
    },
  });
  const fields = useFieldset(form.ref, form.config);

  return (
    <div>
      <h3>Edit event</h3>
      <Form method="post" {...form.props}>
        <ConformInput
          label="Event name"
          input={conform.input(fields.name.config)}
          error={fields.name.error}
        />
        <ConformInput
          label="Running from (local)"
          input={conform.input(fields.runningFrom.config, {
            type: "datetime-local",
          })}
          error={fields.runningFrom.error}
        />
        <ConformInput
          label="Running to (local)"
          input={conform.input(fields.runningTo.config, {
            type: "datetime-local",
          })}
          error={fields.runningTo.error}
        />
        <ConformSelect
          label="Event visibility"
          select={conform.select(fields.visibility.config)}
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
