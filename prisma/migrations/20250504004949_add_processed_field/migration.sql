/*
  Warnings:

  - Added the required column `timestamp` to the `dlq_messages` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "dlq_messages" ADD COLUMN     "processed" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "timestamp" TIMESTAMP(3) NOT NULL,
ALTER COLUMN "retryCount" DROP DEFAULT;
