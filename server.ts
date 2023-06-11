/* eslint-disable unicorn/prefer-module -- dynamic require */
import path from "node:path";

import { createRequestHandler } from "@remix-run/express";
import compression from "compression";
import express from "express";
import { StatusCodes } from "http-status-codes";
import morgan from "morgan";

// eslint-disable-next-line @typescript-eslint/no-magic-numbers -- constant
const HSTS_MAX_AGE_SECONDS = 60 * 60 * 24 * 365 * 100;

const app = express();

app.use((request, response, next) => {
  // helpful headers:
  response.set("x-fly-region", process.env.FLY_REGION ?? "unknown");
  response.set("Strict-Transport-Security", `max-age=${HSTS_MAX_AGE_SECONDS}`);

  // /clean-urls/ -> /clean-urls
  if (request.path.endsWith("/") && request.path.length > 1) {
    const query = request.url.slice(request.path.length);
    const safepath = request.path.slice(0, -1).replaceAll(/\/+/g, "/");
    response.redirect(StatusCodes.MOVED_PERMANENTLY, safepath + query);
    return;
  }
  next();
});

// if we're not in the primary region, then we need to make sure all
// non-GET/HEAD/OPTIONS requests hit the primary region rather than read-only
// Postgres DBs.
// learn more: https://fly.io/docs/getting-started/multi-region-databases/#replay-the-request
app.all("*", function getReplayResponse(request, response, next) {
  const { method, path: pathname } = request;
  const { PRIMARY_REGION, FLY_REGION } = process.env;

  const isMethodReplayable = !["GET", "OPTIONS", "HEAD"].includes(method);
  const isReadOnlyRegion =
    FLY_REGION && PRIMARY_REGION && FLY_REGION !== PRIMARY_REGION;

  const shouldReplay = isMethodReplayable && isReadOnlyRegion;

  if (!shouldReplay) return next();

  const logInfo = {
    pathname,
    method,
    PRIMARY_REGION,
    FLY_REGION,
  };
  console.info(`Replaying:`, logInfo);
  response.set("fly-replay", `region=${PRIMARY_REGION}`);
  return response.sendStatus(StatusCodes.CONFLICT);
});

app.use(compression());

// http://expressjs.com/en/advanced/best-practice-security.html#at-a-minimum-disable-x-powered-by-header
app.disable("x-powered-by");

// Remix fingerprints its assets so we can cache forever.
app.use(
  "/build",
  express.static("public/build", { immutable: true, maxAge: "1y" })
);

// Everything else (like favicon.ico) is cached for an hour. You may want to be
// more aggressive with this caching.
app.use(express.static("public", { maxAge: "1h" }));

app.use(morgan("tiny"));

const MODE = process.env.NODE_ENV;
const BUILD_DIR = path.join(process.cwd(), "build");

app.all(
  "*",
  MODE === "production"
    ? createRequestHandler({ build: require(BUILD_DIR) })
    : (...arguments_) => {
        purgeRequireCache();
        const requestHandler = createRequestHandler({
          build: require(BUILD_DIR),
          mode: MODE,
        });
        return requestHandler(...arguments_);
      }
);

// eslint-disable-next-line @typescript-eslint/no-magic-numbers -- default port
const port = process.env.PORT || 3000;

app.listen(port, () => {
  // require the built app so we're ready when the first request comes in
  require(BUILD_DIR);
  console.log(`✅ app ready: http://localhost:${port}`);
});

function purgeRequireCache() {
  // purge require cache on requests for "server side HMR" this won't let
  // you have in-memory objects between requests in development,
  // alternatively you can set up nodemon/pm2-dev to restart the server on
  // file changes, we prefer the DX of this though, so we've included it
  // for you by default
  for (const key in require.cache) {
    if (key.startsWith(BUILD_DIR)) {
      delete require.cache[key];
    }
  }
}
/* eslint-enable unicorn/prefer-module */
