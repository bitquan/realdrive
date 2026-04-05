ALTER TABLE "Ride"
ADD COLUMN "isTest" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "testLabel" TEXT,
ADD COLUMN "createdByAdminId" TEXT,
ADD COLUMN "targetDriverId" TEXT;

CREATE INDEX "Ride_isTest_createdAt_idx"
ON "Ride"("isTest", "createdAt");

CREATE INDEX "Ride_targetDriverId_status_idx"
ON "Ride"("targetDriverId", "status");
