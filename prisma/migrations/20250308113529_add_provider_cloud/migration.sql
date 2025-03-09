-- AlterTable
ALTER TABLE "archivos" ADD COLUMN     "provider" TEXT;

-- CreateIndex
CREATE INDEX "archivos_provider_idx" ON "archivos"("provider");
