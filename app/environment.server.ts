import * as z from "zod";

/* eslint-disable @typescript-eslint/no-magic-numbers -- schema validation */
const environmentSchema = z.object({
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
  SESSION_SECRET: z.string().min(1),
  DATABASE_URL: z.string().url(),
  E2E_USER_PASSWORD: z.string().min(8).optional(),
});
/* eslint-enable @typescript-eslint/no-magic-numbers */

const environment = environmentSchema.parse(process.env);

export { environment };
