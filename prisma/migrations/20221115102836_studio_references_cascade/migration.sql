-- DropForeignKey
ALTER TABLE "App" DROP CONSTRAINT "App_studioId_fkey";

-- AddForeignKey
ALTER TABLE "App" ADD CONSTRAINT "App_studioId_fkey" FOREIGN KEY ("studioId") REFERENCES "Studio"("id") ON DELETE CASCADE ON UPDATE CASCADE;
