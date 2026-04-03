-- CreateEnum
CREATE TYPE "DriverInterestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- AlterTable
ALTER TABLE "Ride"
ADD COLUMN "publicTrackingToken" TEXT,
ADD COLUMN "referredByCode" TEXT,
ADD COLUMN "referredByUserId" TEXT;

-- AlterTable
ALTER TABLE "User"
ADD COLUMN "referralCode" TEXT;

-- CreateTable
CREATE TABLE "RiderLead" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "referredByUserId" TEXT,
    "referredByCode" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RiderLead_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DriverInterest" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "serviceArea" TEXT NOT NULL,
    "vehicleInfo" TEXT NOT NULL,
    "availabilityNotes" TEXT,
    "status" "DriverInterestStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DriverInterest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Ride_publicTrackingToken_key" ON "Ride"("publicTrackingToken");

-- CreateIndex
CREATE UNIQUE INDEX "User_referralCode_key" ON "User"("referralCode");

-- AddForeignKey
ALTER TABLE "Ride"
ADD CONSTRAINT "Ride_referredByUserId_fkey"
FOREIGN KEY ("referredByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RiderLead"
ADD CONSTRAINT "RiderLead_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RiderLead"
ADD CONSTRAINT "RiderLead_referredByUserId_fkey"
FOREIGN KEY ("referredByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
