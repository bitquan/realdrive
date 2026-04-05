-- CreateTable
CREATE TABLE "AdPricingSettings" (
    "id" TEXT NOT NULL,
    "baseDailyPrice" DECIMAL(10,2) NOT NULL DEFAULT 10,
    "defaultDriverCreditPerScan" DECIMAL(10,2) NOT NULL DEFAULT 0.25,
    "dedupeWindowMinutes" INTEGER NOT NULL DEFAULT 30,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AdPricingSettings_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "AdScanEvent"
ADD COLUMN     "ipAddress" TEXT,
ADD COLUMN     "fingerprint" TEXT,
ADD COLUMN     "creditEligible" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "blockedReason" TEXT;

-- CreateIndex
CREATE INDEX "AdScanEvent_submissionId_fingerprint_createdAt_idx" ON "AdScanEvent"("submissionId", "fingerprint", "createdAt");
