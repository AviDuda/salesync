import type { Submission } from "@conform-to/dom";
import { useMatches } from "@remix-run/react";
import { format } from "date-fns";
import type { ReactNode } from "react";
import { Fragment, useMemo } from "react";

import type { User } from "~/models/user.server";

const DEFAULT_REDIRECT = "/";

/**
 * This should be used any time the redirect path is user-provided
 * (Like the query string on our login/signup pages). This avoids
 * open-redirect vulnerabilities.
 * @param {string} to The redirect destination
 * @param {string} defaultRedirect The redirect to use if the to is unsafe.
 */
export function safeRedirect(
  to: FormDataEntryValue | string | null | undefined,
  defaultRedirect: string = DEFAULT_REDIRECT
) {
  if (!to || typeof to !== "string") {
    return defaultRedirect;
  }

  if (!to.startsWith("/") || to.startsWith("//")) {
    return defaultRedirect;
  }

  return to;
}

/**
 * This base hook is used in other hooks to quickly search for specific data
 * across all loader data using useMatches.
 * @param {string} id The route id
 * @returns {JSON|undefined} The router data or undefined if not found
 */
export function useMatchesData<TData = Record<string, unknown>>(
  id: string
): TData | undefined {
  const matchingRoutes = useMatches();
  const route = useMemo(
    () => matchingRoutes.find((route) => route.id === id),
    [matchingRoutes, id]
  );
  return route?.data as TData;
}

function isUser(user: any): user is User {
  return user && typeof user === "object" && typeof user.email === "string";
}

export function useOptionalUser(): User | undefined {
  const data = useMatchesData("root");
  if (!data || !isUser(data.user)) {
    return undefined;
  }
  return data.user;
}

export function useUser(): User {
  const maybeUser = useOptionalUser();
  if (!maybeUser) {
    throw new Error(
      "No user found in root loader, but user is required by useUser. If user is optional, try useOptionalUser instead."
    );
  }
  return maybeUser;
}

export function validateEmail(email: unknown): email is string {
  const minLength = 3;
  return (
    typeof email === "string" && email.length > minLength && email.includes("@")
  );
}

export function dateToYearMonthDay(date: Date) {
  return format(date, "yyyy-MM-dd");
}

export function datetimeToDatetimeLocalInput(date: Date) {
  return format(date, "yyyy-MM-dd'T'HH:mm");
}

export function nl2br(text: string) {
  return text.split("\n").map((item, key) => {
    return (
      <Fragment key={key}>
        {item}
        <br />
      </Fragment>
    );
  });
}

export function formatError(error: unknown, defaultMessage = "Unknown error") {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === "string") {
    return error;
  }
  console.error("formatError: Unknown error type", error);
  return defaultMessage;
}

/**
 * Adds a global error to a Conform submission
 */
export function addSubmissionError<TSubmission>({
  submission,
  error,
  defaultMessage = "Unknown error",
}: {
  submission: Submission<TSubmission>;
  error: unknown;
  defaultMessage?: string;
}) {
  return {
    ...submission,
    error: {
      ...submission.error,
      "": formatError(error, defaultMessage),
    },
  } as typeof submission;
}

/**
 * Joins an array with a node
 */
export function jsxJoin(
  array: ReactNode[],
  separator: ReactNode = ", ",
  ignoreEmpty = true
) {
  if (ignoreEmpty) {
    array = array.filter((item) => item !== null && item !== undefined);
  }

  return array.length > 0
    ? // eslint-disable-next-line unicorn/no-array-reduce -- need this here
      array.reduce((result, item) => (
        <>
          {result}
          {separator}
          {item}
        </>
      ))
    : null;
}
