ALTER TABLE "AdPricingSettings"
ADD COLUMN "slotMultipliers" JSONB;

ALTER TABLE "DriverAdCredit"
ADD COLUMN "appliedPlatformDueBatchId" TEXT;

ALTER TABLE "DriverAdCredit"
ADD CONSTRAINT "DriverAdCredit_appliedPlatformDueBatchId_fkey"
FOREIGN KEY ("appliedPlatformDueBatchId") REFERENCES "PlatformDueBatch"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "DriverAdCredit_appliedPlatformDueBatchId_status_idx"
ON "DriverAdCredit"("appliedPlatformDueBatchId", "status");

UPDATE "AdPricingSettings"
SET "slotMultipliers" = '[{"slotRank":1,"multiplier":1.5},{"slotRank":2,"multiplier":1},{"slotRank":3,"multiplier":0.85}]'::jsonb
WHERE "slotMultipliers" IS NULL;
