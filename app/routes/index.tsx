import { Link } from "@remix-run/react";

import { useOptionalUser } from "~/utils";

export default function Index() {
  const user = useOptionalUser();
  return (
    <main className="h-full flex flex-col justify-center">
      <div className="flex flex-col justify-center">
        <p className="mx-auto">
          A site for managing sales events for Steam and other platforms.
        </p>
        <p className="mx-auto">Everything is work in progress!</p>
      </div>
      <div className="mx-auto mt-10 max-w-sm sm:flex sm:max-w-none sm:justify-center">
        {user ? (
          <Link
            to="/admin"
            className="flex items-center justify-center rounded-md border border-transparent bg-white px-4 py-3 text-base font-medium text-blue-700 shadow-sm hover:bg-blue-50 sm:px-8"
          >
            View admin dashboard for {user.email}
          </Link>
        ) : (
          <Link
            to="/login"
            className="button-primary flex items-center justify-center rounded-md px-4 py-3 font-medium"
          >
            Log In
          </Link>
        )}
      </div>
    </main>
  );
}
