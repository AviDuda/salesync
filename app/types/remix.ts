import type { RouteMatch } from "@remix-run/react";

export interface PageHandle {
  /** Used for both breadcrumbs and page titles */
  breadcrumb?: (match: RouteMatch) => string;
  /** Overrides the title from breadcrumb */
  title?: (match: RouteMatch) => string | null;
}
