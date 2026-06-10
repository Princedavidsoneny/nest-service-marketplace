-- CreateTable
CREATE TABLE "demand_requests" (
    "id" SERIAL NOT NULL,
    "customer_id" INTEGER NOT NULL,
    "category" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "city" TEXT,
    "address" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "urgency" TEXT DEFAULT 'normal',
    "budget" DOUBLE PRECISION,
    "status" TEXT NOT NULL DEFAULT 'open',
    "winning_provider_id" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "demand_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "demand_offers" (
    "id" SERIAL NOT NULL,
    "demand_request_id" INTEGER NOT NULL,
    "provider_id" INTEGER NOT NULL,
    "amount" DOUBLE PRECISION,
    "message" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "demand_offers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "demand_offers_demand_request_id_provider_id_key" ON "demand_offers"("demand_request_id", "provider_id");

-- AddForeignKey
ALTER TABLE "demand_requests" ADD CONSTRAINT "demand_requests_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "demand_requests" ADD CONSTRAINT "demand_requests_winning_provider_id_fkey" FOREIGN KEY ("winning_provider_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "demand_offers" ADD CONSTRAINT "demand_offers_demand_request_id_fkey" FOREIGN KEY ("demand_request_id") REFERENCES "demand_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "demand_offers" ADD CONSTRAINT "demand_offers_provider_id_fkey" FOREIGN KEY ("provider_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
