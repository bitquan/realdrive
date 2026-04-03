-- CreateEnum
CREATE TYPE "CommunityVoteChoice" AS ENUM ('YES', 'NO');

-- CreateEnum
CREATE TYPE "DuePaymentMethod" AS ENUM ('CASHAPP', 'ZELLE', 'JIM', 'CASH', 'OTHER');

-- CreateEnum
CREATE TYPE "PlatformDueStatus" AS ENUM ('PENDING', 'PAID', 'WAIVED', 'OVERDUE');

-- AlterTable
ALTER TABLE "Ride"
ADD COLUMN "estimatedCustomerTotal" DECIMAL(10,2),
ADD COLUMN "estimatedPlatformDue" DECIMAL(10,2),
ADD COLUMN "finalCustomerTotal" DECIMAL(10,2),
ADD COLUMN "finalPlatformDue" DECIMAL(10,2);

ALTER TABLE "User"
ADD COLUMN "communityAccessToken" TEXT,
ADD COLUMN "roles" "Role"[] DEFAULT ARRAY['RIDER']::"Role"[];

-- Backfill users to keep the new role array aligned with the legacy role column.
UPDATE "User"
SET "roles" = ARRAY["role"]::"Role"[]
WHERE "roles" IS NULL OR COALESCE(array_length("roles", 1), 0) = 0;

-- Backfill pricing totals for rides that already exist.
UPDATE "Ride"
SET
  "estimatedPlatformDue" = ROUND(COALESCE("quotedFare", 0) * 0.05, 2),
  "estimatedCustomerTotal" = ROUND(COALESCE("quotedFare", 0) * 1.05, 2),
  "finalPlatformDue" = CASE
    WHEN "finalFare" IS NULL THEN NULL
    ELSE ROUND("finalFare" * 0.05, 2)
  END,
  "finalCustomerTotal" = CASE
    WHEN "finalFare" IS NULL THEN NULL
    ELSE ROUND("finalFare" * 1.05, 2)
  END;

ALTER TABLE "Ride"
ALTER COLUMN "estimatedCustomerTotal" SET NOT NULL,
ALTER COLUMN "estimatedPlatformDue" SET NOT NULL;

-- CreateTable
CREATE TABLE "PlatformDue" (
    "id" TEXT NOT NULL,
    "rideId" TEXT NOT NULL,
    "driverId" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "status" "PlatformDueStatus" NOT NULL DEFAULT 'PENDING',
    "dueAt" TIMESTAMP(3) NOT NULL,
    "paidAt" TIMESTAMP(3),
    "paymentMethod" "DuePaymentMethod",
    "note" TEXT,
    "resolvedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlatformDue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlatformPayoutSettings" (
    "id" TEXT NOT NULL DEFAULT 'platform',
    "cashAppHandle" TEXT,
    "zelleHandle" TEXT,
    "jimHandle" TEXT,
    "cashInstructions" TEXT,
    "otherInstructions" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlatformPayoutSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommunityProposal" (
    "id" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "pinned" BOOLEAN NOT NULL DEFAULT false,
    "closed" BOOLEAN NOT NULL DEFAULT false,
    "hidden" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CommunityProposal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommunityVote" (
    "id" TEXT NOT NULL,
    "proposalId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "choice" "CommunityVoteChoice" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CommunityVote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommunityComment" (
    "id" TEXT NOT NULL,
    "proposalId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "hidden" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CommunityComment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PlatformDue_rideId_key" ON "PlatformDue"("rideId");

-- CreateIndex
CREATE UNIQUE INDEX "CommunityVote_proposalId_userId_key" ON "CommunityVote"("proposalId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "User_communityAccessToken_key" ON "User"("communityAccessToken");

-- AddForeignKey
ALTER TABLE "PlatformDue" ADD CONSTRAINT "PlatformDue_rideId_fkey" FOREIGN KEY ("rideId") REFERENCES "Ride"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PlatformDue" ADD CONSTRAINT "PlatformDue_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PlatformDue" ADD CONSTRAINT "PlatformDue_resolvedById_fkey" FOREIGN KEY ("resolvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "CommunityProposal" ADD CONSTRAINT "CommunityProposal_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CommunityVote" ADD CONSTRAINT "CommunityVote_proposalId_fkey" FOREIGN KEY ("proposalId") REFERENCES "CommunityProposal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CommunityVote" ADD CONSTRAINT "CommunityVote_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CommunityComment" ADD CONSTRAINT "CommunityComment_proposalId_fkey" FOREIGN KEY ("proposalId") REFERENCES "CommunityProposal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CommunityComment" ADD CONSTRAINT "CommunityComment_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
