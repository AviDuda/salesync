# base node image
FROM node:16-bullseye-slim as base

# set for base and all layer that inherit from it
ENV NODE_ENV production

# Install openssl for Prisma and pnpm
RUN apt-get update \
    && apt-get install -y openssl \
    && corepack enable \
    && corepack prepare pnpm@latest --activate

# Build the app
FROM base as build

WORKDIR /myapp

ADD . .
RUN pnpm install --prod && pnpm run build

# Finally, build the production image with minimal footprint
FROM base

WORKDIR /myapp

COPY --from=build /myapp/node_modules /myapp/node_modules

COPY --from=build /myapp/build /myapp/build
COPY --from=build /myapp/public /myapp/public

ADD . .

CMD ["pnpm", "run", "start"]
