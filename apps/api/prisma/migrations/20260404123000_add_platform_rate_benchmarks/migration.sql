-- CreateEnum
CREATE TYPE "BenchmarkProvider" AS ENUM ('UBER', 'LYFT');

-- CreateTable
CREATE TABLE "PlatformRateBenchmark" (
    "id" TEXT NOT NULL,
    "provider" "BenchmarkProvider" NOT NULL,
    "marketKey" TEXT NOT NULL DEFAULT 'DEFAULT',
    "rideType" "RideType" NOT NULL,
    "baseFare" DECIMAL(10,2) NOT NULL,
    "perMile" DECIMAL(10,2) NOT NULL,
    "perMinute" DECIMAL(10,2) NOT NULL,
    "multiplier" DECIMAL(10,2) NOT NULL,
    "observedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlatformRateBenchmark_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PlatformRateBenchmark_provider_marketKey_rideType_key" ON "PlatformRateBenchmark"("provider", "marketKey", "rideType");

-- CreateIndex
CREATE INDEX "PlatformRateBenchmark_marketKey_rideType_idx" ON "PlatformRateBenchmark"("marketKey", "rideType");

-- CreateIndex
CREATE INDEX "PlatformRateBenchmark_provider_observedAt_idx" ON "PlatformRateBenchmark"("provider", "observedAt");
