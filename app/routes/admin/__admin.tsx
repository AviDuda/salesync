import { Outlet, useCatch } from "@remix-run/react";
import type {
  ErrorBoundaryComponent,
  LoaderArgs,
} from "@remix-run/server-runtime";
import type { ReactNode } from "react";
import { z } from "zod";
import { requireUserId } from "~/session.server";

export async function loader({ request }: LoaderArgs) {
  await requireUserId(request);
  return null;
}

export default function AdminOutlet() {
  return <Outlet />;
}

export const ErrorBoundary: ErrorBoundaryComponent = ({ error }) => {
  let message: ReactNode;
  try {
    const zodError = new z.ZodError(JSON.parse(error.message));
    message = (
      <div>
        <h2>Failed to parse the form</h2>
        <ul>
          {zodError.issues.map((issue, index) => (
            <li key={index}>
              Field {issue.path.join(" / ")}: {issue.code}: {issue.message}
            </li>
          ))}
        </ul>
      </div>
    );
  } catch {
    message = <p>{error.message}</p>;
  }

  return (
    <div className="mx-4 bg-error px-4 py-2 max-w-full">
      <h1>Error</h1>
      {message}
      {error.stack && (
        <details className="pt-2">
          <summary>Toggle stack trace</summary>
          <pre className="overflow-auto pb-4 text-sm">{error.stack}</pre>
        </details>
      )}
    </div>
  );
};

export function CatchBoundary() {
  const caught = useCatch();

  return (
    <div className="bg-error mx-4 px-4 py-2 max-w-full">
      <h1>Caught</h1>
      <p>Status: {caught.status}</p>
      <pre className="overflow-auto pb-4 text-sm">
        <code>{JSON.stringify(caught.data, null, 2)}</code>
      </pre>
    </div>
  );
}
