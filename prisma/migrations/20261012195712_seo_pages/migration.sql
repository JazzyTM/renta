-- AlterTable
ALTER TABLE "Resort" ADD COLUMN     "namePrep" TEXT;

-- CreateTable
CREATE TABLE "SeoPage" (
    "id" TEXT NOT NULL,
    "resortId" TEXT,
    "filter" TEXT NOT NULL,
    "h1" TEXT,
    "seoTitle" TEXT,
    "seoDescription" TEXT,
    "text" TEXT NOT NULL DEFAULT '',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SeoPage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SeoPage_resortId_filter_key" ON "SeoPage"("resortId", "filter");
