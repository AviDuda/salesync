-- CreateEnum
CREATE TYPE "PlatformType" AS ENUM ('Generic', 'Steam');

-- AlterTable
ALTER TABLE "Platform" ADD COLUMN     "type" "PlatformType" NOT NULL DEFAULT 'Generic';
