-- CreateTable
CREATE TABLE "SiteVisit" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "userId" TEXT,
    "firstSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastPath" TEXT,
    "referrer" TEXT,
    "userAgent" TEXT,
    "heartbeatCount" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "SiteVisit_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SiteVisit_sessionId_key" ON "SiteVisit"("sessionId");

-- CreateIndex
CREATE INDEX "SiteVisit_lastSeenAt_idx" ON "SiteVisit"("lastSeenAt");

-- CreateIndex
CREATE INDEX "SiteVisit_firstSeenAt_idx" ON "SiteVisit"("firstSeenAt");

-- CreateIndex
CREATE INDEX "SiteVisit_userId_idx" ON "SiteVisit"("userId");

-- AddForeignKey
ALTER TABLE "SiteVisit" ADD CONSTRAINT "SiteVisit_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
