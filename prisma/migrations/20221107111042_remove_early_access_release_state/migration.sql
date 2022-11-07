/*
  Warnings:

  - The values [EarlyAccess] on the enum `PlatformReleaseState` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "PlatformReleaseState_new" AS ENUM ('Released', 'NewRelease', 'Upcoming', 'Unknown');
ALTER TABLE "AppPlatform" ALTER COLUMN "releaseState" TYPE "PlatformReleaseState_new" USING ("releaseState"::text::"PlatformReleaseState_new");
ALTER TYPE "PlatformReleaseState" RENAME TO "PlatformReleaseState_old";
ALTER TYPE "PlatformReleaseState_new" RENAME TO "PlatformReleaseState";
DROP TYPE "PlatformReleaseState_old";
COMMIT;
