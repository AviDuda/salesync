import { ifNonEmptyString } from "@conform-to/zod";
import { z } from "zod";

export function preprocessDate(schema = z.date()) {
  return z.preprocess(
    ifNonEmptyString((value) => new Date(value)),
    schema
  );
}

export function preprocessCheckbox(schema = z.boolean().optional()) {
  return z.preprocess((value) => value === "yes", schema);
}
