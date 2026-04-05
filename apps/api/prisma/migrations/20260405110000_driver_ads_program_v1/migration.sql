-- CreateEnum
CREATE TYPE "AdSubmissionStatus" AS ENUM ('SUBMITTED', 'APPROVED', 'PAYMENT_PENDING', 'PAID', 'PUBLISHED', 'REJECTED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "DriverAdCreditStatus" AS ENUM ('PENDING', 'APPLIED', 'VOID');

-- CreateTable
CREATE TABLE "DriverAdProgramEnrollment" (
    "id" TEXT NOT NULL,
    "driverId" TEXT NOT NULL,
    "optedIn" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DriverAdProgramEnrollment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdSubmission" (
    "id" TEXT NOT NULL,
    "businessName" TEXT NOT NULL,
    "contactName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "headline" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "callToAction" TEXT,
    "targetUrl" TEXT NOT NULL,
    "imageFileName" TEXT NOT NULL,
    "imageMimeType" TEXT NOT NULL,
    "imageDataUrl" TEXT NOT NULL,
    "requestedDays" INTEGER NOT NULL,
    "dailyPrice" DECIMAL(10,2) NOT NULL,
    "totalPrice" DECIMAL(10,2) NOT NULL,
    "displaySeconds" INTEGER NOT NULL DEFAULT 10,
    "slotRank" INTEGER NOT NULL DEFAULT 2,
    "driverCreditPerScan" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "status" "AdSubmissionStatus" NOT NULL DEFAULT 'SUBMITTED',
    "redirectToken" TEXT NOT NULL,
    "assignedDriverId" TEXT,
    "paymentNote" TEXT,
    "adminNote" TEXT,
    "approvedAt" TIMESTAMP(3),
    "paymentConfirmedAt" TIMESTAMP(3),
    "publishedAt" TIMESTAMP(3),
    "startsAt" TIMESTAMP(3),
    "endsAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AdSubmission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdScanEvent" (
    "id" TEXT NOT NULL,
    "submissionId" TEXT NOT NULL,
    "driverId" TEXT NOT NULL,
    "redirectToken" TEXT NOT NULL,
    "referrer" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdScanEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DriverAdCredit" (
    "id" TEXT NOT NULL,
    "driverId" TEXT NOT NULL,
    "submissionId" TEXT NOT NULL,
    "scanEventId" TEXT,
    "amount" DECIMAL(10,2) NOT NULL,
    "status" "DriverAdCreditStatus" NOT NULL DEFAULT 'PENDING',
    "note" TEXT,
    "appliedPlatformDueId" TEXT,
    "appliedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DriverAdCredit_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DriverAdProgramEnrollment_driverId_key" ON "DriverAdProgramEnrollment"("driverId");

-- CreateIndex
CREATE UNIQUE INDEX "AdSubmission_redirectToken_key" ON "AdSubmission"("redirectToken");

-- CreateIndex
CREATE INDEX "AdSubmission_status_assignedDriverId_idx" ON "AdSubmission"("status", "assignedDriverId");

-- CreateIndex
CREATE INDEX "AdSubmission_assignedDriverId_publishedAt_idx" ON "AdSubmission"("assignedDriverId", "publishedAt");

-- CreateIndex
CREATE INDEX "AdScanEvent_submissionId_createdAt_idx" ON "AdScanEvent"("submissionId", "createdAt");

-- CreateIndex
CREATE INDEX "AdScanEvent_driverId_createdAt_idx" ON "AdScanEvent"("driverId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "DriverAdCredit_scanEventId_key" ON "DriverAdCredit"("scanEventId");

-- CreateIndex
CREATE INDEX "DriverAdCredit_driverId_status_createdAt_idx" ON "DriverAdCredit"("driverId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "DriverAdCredit_submissionId_createdAt_idx" ON "DriverAdCredit"("submissionId", "createdAt");

-- AddForeignKey
ALTER TABLE "DriverAdProgramEnrollment" ADD CONSTRAINT "DriverAdProgramEnrollment_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdSubmission" ADD CONSTRAINT "AdSubmission_assignedDriverId_fkey" FOREIGN KEY ("assignedDriverId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdScanEvent" ADD CONSTRAINT "AdScanEvent_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "AdSubmission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdScanEvent" ADD CONSTRAINT "AdScanEvent_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DriverAdCredit" ADD CONSTRAINT "DriverAdCredit_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DriverAdCredit" ADD CONSTRAINT "DriverAdCredit_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "AdSubmission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DriverAdCredit" ADD CONSTRAINT "DriverAdCredit_scanEventId_fkey" FOREIGN KEY ("scanEventId") REFERENCES "AdScanEvent"("id") ON DELETE SET NULL ON UPDATE CASCADE;
