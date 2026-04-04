-- CreateTable
CREATE TABLE "IssueReport" (
    "id" TEXT NOT NULL,
    "reporterId" TEXT NOT NULL,
    "reporterRole" "Role" NOT NULL,
    "source" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "details" TEXT,
    "page" TEXT,
    "rideId" TEXT,
    "metadata" JSONB,
    "githubIssueNumber" INTEGER,
    "githubIssueUrl" TEXT,
    "githubSyncStatus" TEXT NOT NULL DEFAULT 'pending',
    "githubSyncError" TEXT,
    "githubSyncedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IssueReport_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "IssueReport_reporterId_createdAt_idx" ON "IssueReport"("reporterId", "createdAt");

-- CreateIndex
CREATE INDEX "IssueReport_rideId_idx" ON "IssueReport"("rideId");

-- CreateIndex
CREATE INDEX "IssueReport_githubSyncStatus_createdAt_idx" ON "IssueReport"("githubSyncStatus", "createdAt");

-- AddForeignKey
ALTER TABLE "IssueReport" ADD CONSTRAINT "IssueReport_reporterId_fkey" FOREIGN KEY ("reporterId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "IssueReport" ADD CONSTRAINT "IssueReport_rideId_fkey" FOREIGN KEY ("rideId") REFERENCES "Ride"("id") ON DELETE SET NULL ON UPDATE CASCADE;
