-- AlterTable
ALTER TABLE "AppPlatform" ADD COLUMN     "isEarlyAccess" BOOLEAN NOT NULL DEFAULT false;

-- Set the early access field when release state is set to it
UPDATE "AppPlatform" SET "isEarlyAccess"=true, "releaseState"='Unknown' WHERE "releaseState"='EarlyAccess';
