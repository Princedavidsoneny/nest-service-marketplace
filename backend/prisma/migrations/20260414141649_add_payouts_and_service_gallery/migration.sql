-- AlterTable
ALTER TABLE "payments" ADD COLUMN     "platform_fee" INTEGER,
ADD COLUMN     "provider_id" INTEGER,
ADD COLUMN     "provider_share" INTEGER,
ADD COLUMN     "subaccount_code" TEXT;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "account_name" TEXT,
ADD COLUMN     "account_number" TEXT,
ADD COLUMN     "bank_code" TEXT,
ADD COLUMN     "bank_name" TEXT,
ADD COLUMN     "payout_business_name" TEXT,
ADD COLUMN     "payout_verified" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "paystack_subaccount_code" TEXT,
ADD COLUMN     "platform_split_percent" DOUBLE PRECISION NOT NULL DEFAULT 10;

-- CreateTable
CREATE TABLE "service_images" (
    "id" SERIAL NOT NULL,
    "service_id" INTEGER NOT NULL,
    "image_url" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "service_images_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "service_images" ADD CONSTRAINT "service_images_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "services"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_provider_id_fkey" FOREIGN KEY ("provider_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
