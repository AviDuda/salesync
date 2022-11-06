import { faker } from "@faker-js/faker";
import { format } from "date-fns";

type SpacePosition = "before" | "after" | "both" | "none";
const defaultSpacePosition: SpacePosition = "none";

function getSpace(
  currentLocation: "before" | "after",
  position: SpacePosition
) {
  return position === currentLocation || position === "both" ? " " : "";
}

export function maybeText(
  callback: () => string,
  options?: Parameters<typeof faker["helpers"]["maybe"]>[1]
): string {
  return faker.helpers.maybe<string>(callback, options) ?? "";
}

export function maybeTrademark() {
  return maybeText(() => faker.helpers.arrayElement(["®", "™"]), {
    probability: 0.05,
  });
}

export function maybeNumber(args?: {
  min?: number;
  max?: number;
  probability?: number;
  space?: SpacePosition;
}) {
  const opts = {
    ...args,
    space: args?.space ?? defaultSpacePosition,
  };

  return maybeText(
    () =>
      getSpace("before", opts.space) +
      faker.datatype.number({ min: opts.min, max: opts.max }) +
      getSpace("after", opts.space),
    { probability: opts?.probability }
  );
}

export function maybeYear(args: { date: Date; space?: SpacePosition }) {
  const opts = {
    ...args,
    space: args.space ?? defaultSpacePosition,
  };

  return maybeText(() => {
    const year = faker.helpers.arrayElement([
      () => format(opts.date, "yy"),
      () => format(opts.date, "yyyy"),
    ])();
    return (
      getSpace("before", opts.space) + year + getSpace("after", opts.space)
    );
  });
}

export function maybeYearBetween(args: {
  from: Date;
  to: Date;
  probability?: number;
  space?: SpacePosition;
}) {
  const opts = {
    ...args,
    space: args?.space ?? defaultSpacePosition,
  };

  const suffixDate = faker.date.between(opts.from, opts.to);

  return maybeText(
    () =>
      faker.helpers.arrayElement([
        // Simple year suffix
        () =>
          getSpace("before", opts.space) +
          format(suffixDate, "yy") +
          getSpace("after", opts.space),
        // Full year suffix
        () =>
          getSpace("before", opts.space) +
          format(suffixDate, "yyyy") +
          getSpace("after", opts.space),
      ])(),
    { probability: opts.probability }
  );
}
