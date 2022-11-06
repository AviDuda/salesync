import { UserRole } from "@prisma/client";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

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
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
