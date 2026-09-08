-- AlterTable: AI skorlama alanları + Excel geri dönüş alanları

ALTER TABLE "Search" ADD COLUMN     "enrichWithAi" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "SearchResult" ADD COLUMN     "aiModel" TEXT,
ADD COLUMN     "aiNote" TEXT,
ADD COLUMN     "aiReason" TEXT,
ADD COLUMN     "aiScore" INTEGER;

ALTER TABLE "Lead" ADD COLUMN     "aiModel" TEXT,
ADD COLUMN     "aiNote" TEXT,
ADD COLUMN     "aiReason" TEXT,
ADD COLUMN     "aiScore" INTEGER,
ADD COLUMN     "lastContactAt" TIMESTAMP(3);
