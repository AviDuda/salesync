#!/bin/sh

if [ -x "node_modules/prisma" ]
then
  pnpm prisma generate
elif [ -x "app/prisma-client" ]
then
  exit 0
else
  # for multistage docker build, dev deps won't be installed in production mode
  prisma_version=$(pnpm list --depth 0 --dev --parseable | grep -o -m 1 'prisma@[0-9]\+\.[0-9]\+\.[0-9]\+$')
  if [ "$prisma_version" = "" ]; then
    echo "Missing prisma version in pnpm list"
    exit 1
  fi

  pnpm dlx "$prisma_version" generate
fi

rm -rf node_modules/.prisma

exit 0
