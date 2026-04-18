-- CreateTable
CREATE TABLE "User" (
    "user_id" SERIAL NOT NULL,
    "full_name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("user_id")
);

-- CreateTable
CREATE TABLE "Farm" (
    "farm_id" SERIAL NOT NULL,
    "farm_name" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Farm_pkey" PRIMARY KEY ("farm_id")
);

-- CreateTable
CREATE TABLE "Animal" (
    "animal_id" SERIAL NOT NULL,
    "animal_code" TEXT NOT NULL,
    "animal_type" TEXT NOT NULL,
    "age" INTEGER NOT NULL,
    "gender" TEXT NOT NULL,
    "farm_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Animal_pkey" PRIMARY KEY ("animal_id")
);

-- CreateTable
CREATE TABLE "Vaccine" (
    "vaccine_id" SERIAL NOT NULL,
    "vaccine_name" TEXT NOT NULL,
    "description" TEXT,
    "validity_period_days" INTEGER NOT NULL,
    "recommended_interval_days" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Vaccine_pkey" PRIMARY KEY ("vaccine_id")
);

-- CreateTable
CREATE TABLE "Supplier" (
    "supplier_id" SERIAL NOT NULL,
    "supplier_name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Supplier_pkey" PRIMARY KEY ("supplier_id")
);

-- CreateTable
CREATE TABLE "VaccineStock" (
    "stock_id" SERIAL NOT NULL,
    "vaccine_id" INTEGER NOT NULL,
    "supplier_id" INTEGER NOT NULL,
    "quantity_purchased" INTEGER NOT NULL,
    "purchase_price" DOUBLE PRECISION NOT NULL,
    "purchase_date" TIMESTAMP(3) NOT NULL,
    "expiry_date" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VaccineStock_pkey" PRIMARY KEY ("stock_id")
);

-- CreateTable
CREATE TABLE "Vaccination" (
    "vaccination_id" SERIAL NOT NULL,
    "animal_id" INTEGER NOT NULL,
    "vaccine_id" INTEGER NOT NULL,
    "administered_by" INTEGER NOT NULL,
    "stock_id" INTEGER NOT NULL,
    "date_administered" TIMESTAMP(3) NOT NULL,
    "next_due_date" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Vaccination_pkey" PRIMARY KEY ("vaccination_id")
);

-- CreateTable
CREATE TABLE "VaccinationSchedule" (
    "schedule_id" SERIAL NOT NULL,
    "vaccine_id" INTEGER NOT NULL,
    "schedule_type" TEXT NOT NULL,
    "scheduled_date" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VaccinationSchedule_pkey" PRIMARY KEY ("schedule_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Animal_animal_code_key" ON "Animal"("animal_code");

-- AddForeignKey
ALTER TABLE "Animal" ADD CONSTRAINT "Animal_farm_id_fkey" FOREIGN KEY ("farm_id") REFERENCES "Farm"("farm_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VaccineStock" ADD CONSTRAINT "VaccineStock_vaccine_id_fkey" FOREIGN KEY ("vaccine_id") REFERENCES "Vaccine"("vaccine_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VaccineStock" ADD CONSTRAINT "VaccineStock_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "Supplier"("supplier_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vaccination" ADD CONSTRAINT "Vaccination_animal_id_fkey" FOREIGN KEY ("animal_id") REFERENCES "Animal"("animal_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vaccination" ADD CONSTRAINT "Vaccination_vaccine_id_fkey" FOREIGN KEY ("vaccine_id") REFERENCES "Vaccine"("vaccine_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vaccination" ADD CONSTRAINT "Vaccination_administered_by_fkey" FOREIGN KEY ("administered_by") REFERENCES "User"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vaccination" ADD CONSTRAINT "Vaccination_stock_id_fkey" FOREIGN KEY ("stock_id") REFERENCES "VaccineStock"("stock_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VaccinationSchedule" ADD CONSTRAINT "VaccinationSchedule_vaccine_id_fkey" FOREIGN KEY ("vaccine_id") REFERENCES "Vaccine"("vaccine_id") ON DELETE RESTRICT ON UPDATE CASCADE;
