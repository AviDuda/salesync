#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-magic-numbers -- this entire file is magic */
import bcrypt from "bcryptjs";

import { UserRole } from "~/prisma-client";
import { PrismaClient } from "~/prisma-client";

const prisma = new PrismaClient();

async function seed() {
  const passwordHash = await bcrypt.hash("password", 10);

  await prisma.user.create({
    data: {
      email: "admin@example.com",
      name: "Admin",
      role: UserRole.Admin,
      password: { create: { hash: passwordHash } },
    },
  });

  console.log(`Database has been seeded. 🌱`);
}

seed()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  // eslint-disable-next-line unicorn/prefer-top-level-await -- this is a script
  .finally(async () => {
    await prisma.$disconnect();
  });

/* eslint-enable @typescript-eslint/no-magic-numbers */
