-- CreateEnum
CREATE TYPE "PlatformDueBatchStatus" AS ENUM ('OPEN', 'PAID', 'WAIVED', 'OVERDUE', 'VOID');

-- AlterTable
ALTER TABLE "DriverProfile" ADD COLUMN     "collectorAdminId" TEXT;

-- AlterTable
ALTER TABLE "PlatformDue" ADD COLUMN     "batchId" TEXT,
ADD COLUMN     "collectibleAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "PlatformPayoutSettings" ADD COLUMN     "adminId" TEXT,
ALTER COLUMN "id" DROP DEFAULT;

-- CreateTable
CREATE TABLE "PlatformDueBatch" (
    "id" TEXT NOT NULL,
    "referenceCode" TEXT NOT NULL,
    "driverId" TEXT NOT NULL,
    "collectorAdminId" TEXT,
    "amount" DECIMAL(10,2) NOT NULL,
    "status" "PlatformDueBatchStatus" NOT NULL DEFAULT 'OPEN',
    "paymentMethod" "DuePaymentMethod",
    "observedTitle" TEXT,
    "observedNote" TEXT,
    "adminNote" TEXT,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dueAt" TIMESTAMP(3) NOT NULL,
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlatformDueBatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdminInvite" (
    "id" TEXT NOT NULL,
    "inviterId" TEXT NOT NULL,
    "acceptedById" TEXT,
    "email" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "acceptedAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AdminInvite_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PlatformDueBatch_referenceCode_key" ON "PlatformDueBatch"("referenceCode");

-- CreateIndex
CREATE UNIQUE INDEX "AdminInvite_token_key" ON "AdminInvite"("token");

-- CreateIndex
CREATE INDEX "AdminInvite_email_idx" ON "AdminInvite"("email");

-- CreateIndex
CREATE UNIQUE INDEX "PlatformPayoutSettings_adminId_key" ON "PlatformPayoutSettings"("adminId");

-- AddForeignKey
ALTER TABLE "DriverProfile" ADD CONSTRAINT "DriverProfile_collectorAdminId_fkey" FOREIGN KEY ("collectorAdminId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlatformDue" ADD CONSTRAINT "PlatformDue_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "PlatformDueBatch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlatformDueBatch" ADD CONSTRAINT "PlatformDueBatch_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlatformDueBatch" ADD CONSTRAINT "PlatformDueBatch_collectorAdminId_fkey" FOREIGN KEY ("collectorAdminId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlatformPayoutSettings" ADD CONSTRAINT "PlatformPayoutSettings_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdminInvite" ADD CONSTRAINT "AdminInvite_inviterId_fkey" FOREIGN KEY ("inviterId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdminInvite" ADD CONSTRAINT "AdminInvite_acceptedById_fkey" FOREIGN KEY ("acceptedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

