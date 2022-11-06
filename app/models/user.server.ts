import type { Password, Prisma, User } from "~/prisma-client";
import bcrypt from "bcryptjs";

import { prisma } from "~/db.server";

export type { User } from "~/prisma-client";

export async function getUserById(id: User["id"]) {
  return prisma.user.findUnique({ where: { id } });
}

export async function getUserByEmail(email: User["email"]) {
  return prisma.user.findUnique({ where: { email } });
}

export async function createUser(
  user: Prisma.UserUncheckedCreateInput,
  password: Password["hash"]
) {
  const hashedPassword = await bcrypt.hash(password, 10);

  return prisma.user.create({
    data: {
      ...user,
      password: {
        create: {
          hash: hashedPassword,
        },
      },
    },
  });
}

export async function updateUser(
  where: Prisma.UserWhereUniqueInput,
  user: Prisma.UserUncheckedUpdateInput,
  password?: string
) {
  const hashedPassword = password ? await bcrypt.hash(password, 10) : undefined;
  const passwordUpdate = hashedPassword
    ? {
        update: {
          hash: hashedPassword,
        },
      }
    : undefined;

  return prisma.user.update({
    where,
    data: {
      ...user,
      password: passwordUpdate,
    },
  });
}

export async function deleteUserByEmail(email: User["email"]) {
  return prisma.user.delete({ where: { email } });
}

export async function verifyLogin(
  email: User["email"],
  password: Password["hash"]
) {
  const userWithPassword = await prisma.user.findUnique({
    where: { email },
    include: {
      password: true,
    },
  });

  if (!userWithPassword || !userWithPassword.password) {
    return null;
  }

  const isValid = await bcrypt.compare(
    password,
    userWithPassword.password.hash
  );

  if (!isValid) {
    return null;
  }

  const { password: _password, ...userWithoutPassword } = userWithPassword;

  return userWithoutPassword;
}
