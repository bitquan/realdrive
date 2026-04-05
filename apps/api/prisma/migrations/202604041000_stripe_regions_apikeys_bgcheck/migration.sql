-- AlterEnum: add STRIPE to DuePaymentMethod
ALTER TYPE "DuePaymentMethod" ADD VALUE 'STRIPE';

-- AlterTable: add Stripe checkout fields to PlatformDue
ALTER TABLE "PlatformDue"
ADD COLUMN "stripeCheckoutSessionId" TEXT,
ADD COLUMN "stripeCheckoutUrl"       TEXT;

-- AlterTable: add bg check fields to DriverProfile
ALTER TABLE "DriverProfile"
ADD COLUMN "bgCheckExternalId" TEXT,
ADD COLUMN "bgCheckOrderedAt"  TIMESTAMP(3);

-- CreateTable: MarketRegion
CREATE TABLE "MarketRegion" (
    "id"                       TEXT NOT NULL,
    "marketKey"                TEXT NOT NULL,
    "displayName"              TEXT NOT NULL,
    "timezone"                 TEXT NOT NULL DEFAULT 'America/New_York',
    "serviceStates"            TEXT[] DEFAULT ARRAY[]::TEXT[],
    "serviceHours"             JSONB,
    "dispatchWeightMultiplier" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "active"                   BOOLEAN NOT NULL DEFAULT true,
    "createdAt"                TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"                TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MarketRegion_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "MarketRegion_marketKey_key" ON "MarketRegion"("marketKey");
CREATE INDEX "MarketRegion_active_idx" ON "MarketRegion"("active");

-- Seed DEFAULT region so existing data has a region record
INSERT INTO "MarketRegion" ("id", "marketKey", "displayName", "timezone", "serviceStates", "dispatchWeightMultiplier", "active", "createdAt", "updatedAt")
VALUES (gen_random_uuid()::text, 'DEFAULT', 'Default Market', 'America/New_York', ARRAY[]::TEXT[], 1.0, true, NOW(), NOW())
ON CONFLICT ("marketKey") DO NOTHING;

-- CreateTable: ApiKey
CREATE TABLE "ApiKey" (
    "id"         TEXT NOT NULL,
    "label"      TEXT NOT NULL,
    "keyPrefix"  TEXT NOT NULL,
    "keyHash"    TEXT NOT NULL,
    "scopes"     TEXT[] DEFAULT ARRAY[]::TEXT[],
    "ownerId"    TEXT NOT NULL,
    "lastUsedAt" TIMESTAMP(3),
    "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt"  TIMESTAMP(3),

    CONSTRAINT "ApiKey_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ApiKey_keyHash_key" ON "ApiKey"("keyHash");
CREATE INDEX "ApiKey_ownerId_idx" ON "ApiKey"("ownerId");
CREATE INDEX "ApiKey_revokedAt_idx" ON "ApiKey"("revokedAt");

-- AddForeignKey for ApiKey
ALTER TABLE "ApiKey" ADD CONSTRAINT "ApiKey_ownerId_fkey"
  FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
