/**
 * @type {import('@remix-run/dev').AppConfig}
 */
module.exports = {
  cacheDirectory: "./node_modules/.cache/remix",
  future: {
    v2_errorBoundary: true,
    v2_meta: true,
    v2_headers: false,
    v2_routeConvention: true,
    v2_normalizeFormMethod: false,
  },
  ignoredRouteFiles: ["**/.*", "**/*.test.{js,jsx,ts,tsx}"],
  postcss: true,
  serverModuleFormat: "cjs",
  tailwind: true,
};
