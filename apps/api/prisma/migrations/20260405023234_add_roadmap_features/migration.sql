-- CreateTable
CREATE TABLE "RoadmapFeatureVote" (
    "id" TEXT NOT NULL,
    "featureId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "votedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RoadmapFeatureVote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FeatureRequest" (
    "id" TEXT NOT NULL,
    "requesterId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT,
    "status" TEXT NOT NULL DEFAULT 'submitted',
    "voteCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FeatureRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RoadmapFeatureVote_featureId_idx" ON "RoadmapFeatureVote"("featureId");

-- CreateIndex
CREATE INDEX "RoadmapFeatureVote_userId_idx" ON "RoadmapFeatureVote"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "RoadmapFeatureVote_featureId_userId_key" ON "RoadmapFeatureVote"("featureId", "userId");

-- CreateIndex
CREATE INDEX "FeatureRequest_requesterId_idx" ON "FeatureRequest"("requesterId");

-- CreateIndex
CREATE INDEX "FeatureRequest_status_idx" ON "FeatureRequest"("status");

-- CreateIndex
CREATE INDEX "FeatureRequest_voteCount_idx" ON "FeatureRequest"("voteCount");

-- AddForeignKey
ALTER TABLE "RoadmapFeatureVote" ADD CONSTRAINT "RoadmapFeatureVote_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeatureRequest" ADD CONSTRAINT "FeatureRequest_requesterId_fkey" FOREIGN KEY ("requesterId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
