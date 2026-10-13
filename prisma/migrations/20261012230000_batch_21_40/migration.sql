-- AlterTable
ALTER TABLE "Listing" ADD COLUMN     "descriptionEn" TEXT,
ADD COLUMN     "icalError" TEXT,
ADD COLUMN     "icalSyncedAt" TIMESTAMP(3),
ADD COLUMN     "icalUrl" TEXT,
ADD COLUMN     "titleEn" TEXT;

-- AlterTable
ALTER TABLE "Resort" ADD COLUMN     "guide" TEXT;

-- AlterTable
ALTER TABLE "Review" ADD COLUMN     "cleanliness" INTEGER,
ADD COLUMN     "location" INTEGER,
ADD COLUMN     "service" INTEGER,
ADD COLUMN     "value" INTEGER;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "idDocPath" TEXT,
ADD COLUMN     "idNote" TEXT,
ADD COLUMN     "idStatus" TEXT,
ADD COLUMN     "refCode" TEXT,
ADD COLUMN     "referredById" TEXT,
ADD COLUMN     "replyMinutes" INTEGER;

-- CreateTable
CREATE TABLE "BusyDate" (
    "listingId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "source" TEXT NOT NULL,

    CONSTRAINT "BusyDate_pkey" PRIMARY KEY ("listingId","date","source")
);

-- CreateTable
CREATE TABLE "SearchAlert" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "userId" TEXT,
    "resortId" TEXT,
    "query" TEXT NOT NULL DEFAULT '',
    "title" TEXT NOT NULL DEFAULT '',
    "token" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastSentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SearchAlert_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReplyTemplate" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "sort" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReplyTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SearchLog" (
    "id" TEXT NOT NULL,
    "resortId" TEXT,
    "month" INTEGER,
    "guests" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SearchLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Experiment" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "variants" TEXT NOT NULL,
    "goal" TEXT NOT NULL DEFAULT 'request',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Experiment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExperimentEvent" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "variant" INTEGER NOT NULL,
    "kind" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExperimentEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SearchAlert_token_key" ON "SearchAlert"("token");

-- CreateIndex
CREATE INDEX "SearchAlert_isActive_idx" ON "SearchAlert"("isActive");

-- CreateIndex
CREATE INDEX "SearchLog_createdAt_idx" ON "SearchLog"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Experiment_key_key" ON "Experiment"("key");

-- CreateIndex
CREATE INDEX "ExperimentEvent_key_kind_idx" ON "ExperimentEvent"("key", "kind");

-- CreateIndex
CREATE UNIQUE INDEX "User_refCode_key" ON "User"("refCode");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_referredById_fkey" FOREIGN KEY ("referredById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BusyDate" ADD CONSTRAINT "BusyDate_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "Listing"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReplyTemplate" ADD CONSTRAINT "ReplyTemplate_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

