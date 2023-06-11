// eslint-disable-next-line import/no-extraneous-dependencies -- should be used only in dev
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
  options?: Parameters<(typeof faker)["helpers"]["maybe"]>[1]
): string {
  return faker.helpers.maybe<string>(callback, options) ?? "";
}

export function maybeTrademark() {
  return maybeText(() => faker.helpers.arrayElement(["®", "™"]), {
    probability: 0.05,
  });
}

export function maybeNumber(arguments_?: {
  min?: number;
  max?: number;
  probability?: number;
  space?: SpacePosition;
}) {
  const options = {
    ...arguments_,
    space: arguments_?.space ?? defaultSpacePosition,
  };

  return maybeText(
    () =>
      getSpace("before", options.space) +
      faker.number.int({ min: options.min, max: options.max }) +
      getSpace("after", options.space),
    { probability: options?.probability }
  );
}

export function maybeYear(arguments_: { date: Date; space?: SpacePosition }) {
  const options = {
    ...arguments_,
    space: arguments_.space ?? defaultSpacePosition,
  };

  return maybeText(() => {
    const year = faker.helpers.arrayElement([
      () => format(options.date, "yy"),
      () => format(options.date, "yyyy"),
    ])();
    return (
      getSpace("before", options.space) +
      year +
      getSpace("after", options.space)
    );
  });
}

export function maybeYearBetween(arguments_: {
  from: Date;
  to: Date;
  probability?: number;
  space?: SpacePosition;
}) {
  const options = {
    ...arguments_,
    space: arguments_?.space ?? defaultSpacePosition,
  };

  const suffixDate = faker.date.between({ from: options.from, to: options.to });

  return maybeText(
    () =>
      faker.helpers.arrayElement([
        // Simple year suffix
        () =>
          getSpace("before", options.space) +
          format(suffixDate, "yy") +
          getSpace("after", options.space),
        // Full year suffix
        () =>
          getSpace("before", options.space) +
          format(suffixDate, "yyyy") +
          getSpace("after", options.space),
      ])(),
    { probability: options.probability }
  );
}
