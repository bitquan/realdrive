-- CreateEnum
CREATE TYPE "DriverOnboardingDocumentType" AS ENUM ('INSURANCE', 'REGISTRATION', 'BACKGROUND_CHECK', 'MVR');

-- CreateEnum
CREATE TYPE "DriverOnboardingDocumentStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateTable
CREATE TABLE "DriverOnboardingDocument" (
    "id" TEXT NOT NULL,
    "driverId" TEXT NOT NULL,
    "type" "DriverOnboardingDocumentType" NOT NULL,
    "status" "DriverOnboardingDocumentStatus" NOT NULL DEFAULT 'PENDING',
    "fileName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "fileSizeBytes" INTEGER NOT NULL,
    "storagePath" TEXT NOT NULL,
    "reviewNote" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "reviewedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DriverOnboardingDocument_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DriverOnboardingDocument_driverId_type_key" ON "DriverOnboardingDocument"("driverId", "type");

-- AddForeignKey
ALTER TABLE "DriverOnboardingDocument" ADD CONSTRAINT "DriverOnboardingDocument_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "DriverOnboardingDocument" ADD CONSTRAINT "DriverOnboardingDocument_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
