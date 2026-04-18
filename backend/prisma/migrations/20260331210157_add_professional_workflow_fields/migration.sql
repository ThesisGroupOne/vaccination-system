/*
  Warnings:

  - Added the required column `quantity_remaining` to the `VaccineStock` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Animal" ADD COLUMN     "nickname" TEXT,
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'Active';

-- AlterTable
ALTER TABLE "VaccinationSchedule" ADD COLUMN     "farm_id" INTEGER;

-- AlterTable
ALTER TABLE "VaccineStock" ADD COLUMN     "batch_number" TEXT,
ADD COLUMN     "quantity_remaining" INTEGER NOT NULL;

-- CreateTable
CREATE TABLE "Alert" (
    "alert_id" SERIAL NOT NULL,
    "animal_id" INTEGER NOT NULL,
    "farm_id" INTEGER NOT NULL,
    "user_id" INTEGER NOT NULL,
    "symptoms" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'Pending',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Alert_pkey" PRIMARY KEY ("alert_id")
);

-- AddForeignKey
ALTER TABLE "VaccinationSchedule" ADD CONSTRAINT "VaccinationSchedule_farm_id_fkey" FOREIGN KEY ("farm_id") REFERENCES "Farm"("farm_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Alert" ADD CONSTRAINT "Alert_animal_id_fkey" FOREIGN KEY ("animal_id") REFERENCES "Animal"("animal_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Alert" ADD CONSTRAINT "Alert_farm_id_fkey" FOREIGN KEY ("farm_id") REFERENCES "Farm"("farm_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Alert" ADD CONSTRAINT "Alert_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;
