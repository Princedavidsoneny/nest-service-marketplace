/*
  Warnings:

  - A unique constraint covering the columns `[providerTag]` on the table `users` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "users" ADD COLUMN     "address" TEXT,
ADD COLUMN     "city" TEXT,
ADD COLUMN     "latitude" DOUBLE PRECISION,
ADD COLUMN     "longitude" DOUBLE PRECISION,
ADD COLUMN     "phone" TEXT,
ADD COLUMN     "providerTag" TEXT,
ADD COLUMN     "serviceCategory" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "users_providerTag_key" ON "users"("providerTag");
