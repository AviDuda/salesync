# base node image
FROM node:16-bullseye-slim as base

# set for base and all layer that inherit from it
ENV NODE_ENV production

# Install openssl for Prisma and pnpm
RUN apt-get update \
    && apt-get install -y openssl \
    && corepack enable \
    && corepack prepare pnpm@latest --activate

# Install all node_modules, including dev dependencies
FROM base as deps

WORKDIR /myapp

ADD package.json pnpm-lock.yaml .npmrc postinstall.sh ./
ADD prisma ./prisma
RUN NODE_ENV=development pnpm install && ls -al /myapp && ls -al /myapp/app

# Setup production node_modules
FROM base as production-deps

WORKDIR /myapp

COPY --from=deps /myapp/node_modules /myapp/node_modules
COPY --from=deps /myapp/app/prisma-client /myapp/app/prisma-client
ADD package.json pnpm-lock.yaml .npmrc postinstall.sh ./
ADD prisma ./prisma
RUN pnpm prune --prod

# Build the app
FROM base as build

WORKDIR /myapp

COPY --from=deps /myapp/node_modules /myapp/node_modules
COPY --from=deps /myapp/app/prisma-client /myapp/app/prisma-client

ADD . .
RUN pnpm run build

# Finally, build the production image with minimal footprint
FROM base

WORKDIR /myapp

COPY --from=deps /myapp/app/prisma-client /myapp/app/prisma-client
COPY --from=production-deps /myapp/node_modules /myapp/node_modules

COPY --from=build /myapp/build /myapp/build
COPY --from=build /myapp/public /myapp/public
ADD . .

CMD ["pnpm", "run", "start"]
