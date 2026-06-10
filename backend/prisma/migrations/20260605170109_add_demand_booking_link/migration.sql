/*
  Warnings:

  - A unique constraint covering the columns `[demand_request_id]` on the table `bookings` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE "public"."bookings" DROP CONSTRAINT "bookings_service_id_fkey";

-- AlterTable
ALTER TABLE "bookings" ADD COLUMN     "demand_request_id" INTEGER,
ADD COLUMN     "provider_id" INTEGER,
ALTER COLUMN "service_id" DROP NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "bookings_demand_request_id_key" ON "bookings"("demand_request_id");

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_provider_id_fkey" FOREIGN KEY ("provider_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "services"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_demand_request_id_fkey" FOREIGN KEY ("demand_request_id") REFERENCES "demand_requests"("id") ON DELETE SET NULL ON UPDATE CASCADE;
