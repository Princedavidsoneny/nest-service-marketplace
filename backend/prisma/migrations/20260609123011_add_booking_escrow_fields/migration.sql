-- AlterTable
ALTER TABLE "bookings" ADD COLUMN     "escrow_status" TEXT NOT NULL DEFAULT 'unpaid',
ADD COLUMN     "platform_fee" INTEGER,
ADD COLUMN     "provider_earning" INTEGER;
