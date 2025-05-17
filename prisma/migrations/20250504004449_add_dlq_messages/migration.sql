-- CreateTable
CREATE TABLE "dlq_messages" (
    "id" TEXT NOT NULL,
    "originalQueue" TEXT NOT NULL,
    "errorMessage" TEXT NOT NULL,
    "payload" TEXT NOT NULL,
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "dlq_messages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "dlq_messages_originalQueue_idx" ON "dlq_messages"("originalQueue");

-- CreateIndex
CREATE INDEX "dlq_messages_createdAt_idx" ON "dlq_messages"("createdAt");
