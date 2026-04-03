-- CreateEnum
CREATE TYPE "DriverApprovalStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "DriverPricingMode" AS ENUM ('PLATFORM', 'CUSTOM');

-- CreateEnum
CREATE TYPE "RidePricingSource" AS ENUM ('PLATFORM_MARKET', 'DRIVER_CUSTOM', 'ADMIN_OVERRIDE');

-- DropIndex
DROP INDEX "PricingRule_rideType_key";

-- AlterTable
ALTER TABLE "DriverProfile"
ADD COLUMN "approvalStatus" "DriverApprovalStatus" NOT NULL DEFAULT 'PENDING',
ADD COLUMN "homeCity" TEXT,
ADD COLUMN "homeState" TEXT,
ADD COLUMN "localDispatchEnabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "localRadiusMiles" INTEGER NOT NULL DEFAULT 25,
ADD COLUMN "nationwideDispatchEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "pricingMode" "DriverPricingMode" NOT NULL DEFAULT 'PLATFORM',
ADD COLUMN "serviceAreaDispatchEnabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "serviceAreaStates" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- AlterTable
ALTER TABLE "PricingRule"
ADD COLUMN "marketKey" TEXT NOT NULL DEFAULT 'DEFAULT';

-- AlterTable
ALTER TABLE "Ride"
ADD COLUMN "dropoffStateCode" TEXT,
ADD COLUMN "estimatedPricingSource" "RidePricingSource" NOT NULL DEFAULT 'PLATFORM_MARKET',
ADD COLUMN "finalPricingSource" "RidePricingSource",
ADD COLUMN "matchedDriverPricingMode" "DriverPricingMode",
ADD COLUMN "pickupStateCode" TEXT,
ADD COLUMN "platformMarketKey" TEXT;

-- CreateTable
CREATE TABLE "DriverRateCard" (
    "id" TEXT NOT NULL,
    "driverId" TEXT NOT NULL,
    "rideType" "RideType" NOT NULL,
    "baseFare" DECIMAL(10,2) NOT NULL,
    "perMile" DECIMAL(10,2) NOT NULL,
    "perMinute" DECIMAL(10,2) NOT NULL,
    "multiplier" DECIMAL(10,2) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DriverRateCard_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DriverRateCard_driverId_rideType_key" ON "DriverRateCard"("driverId", "rideType");

-- CreateIndex
CREATE UNIQUE INDEX "PricingRule_marketKey_rideType_key" ON "PricingRule"("marketKey", "rideType");

-- AddForeignKey
ALTER TABLE "DriverRateCard"
ADD CONSTRAINT "DriverRateCard_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
