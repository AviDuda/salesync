#!/bin/sh

if [ -x "node_modules/prisma" ]
then
  pnpm prisma generate
else
  # for multistage docker build, dev deps won't be installed in production mode
  pnpm dlx "$(pnpm list --depth 0 --dev --parseable | grep -o -m 1 'prisma@[0-9]\+\.[0-9]\+\.[0-9]\+$' )" generate
fi

rm -rf node_modules/.prisma

exit 0