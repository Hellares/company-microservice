/*
  Warnings:

  - Changed the type of `fieldValue` on the `CustomField` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- AlterTable
ALTER TABLE "CustomField" DROP COLUMN "fieldValue",
ADD COLUMN     "fieldValue" JSONB NOT NULL;
