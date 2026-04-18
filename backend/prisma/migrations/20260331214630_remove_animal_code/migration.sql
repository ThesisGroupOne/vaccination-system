/*
  Warnings:

  - You are about to drop the column `animal_code` on the `Animal` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "Animal_animal_code_key";

-- AlterTable
ALTER TABLE "Animal" DROP COLUMN "animal_code";
