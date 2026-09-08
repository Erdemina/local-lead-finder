-- Toplu (çok illi) tarama: 81 il taraması tek iş olarak izlenir ve dışa aktarılır.

ALTER TABLE "Search" ADD COLUMN     "batchId" TEXT,
ADD COLUMN     "batchLabel" TEXT;

CREATE INDEX "Search_tenantId_batchId_idx" ON "Search"("tenantId", "batchId");
