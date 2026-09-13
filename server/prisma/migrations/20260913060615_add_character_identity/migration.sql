/*
  Warnings:

  - A unique constraint covering the columns `[characterId]` on the table `Character` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "Character_name_key";

-- AlterTable
ALTER TABLE "Character" ADD COLUMN "characterId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Character_characterId_key" ON "Character"("characterId");
