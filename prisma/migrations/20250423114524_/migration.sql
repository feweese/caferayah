/*
  Warnings:

  - You are about to drop the column `completedAt` on the `Order` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Order" DROP COLUMN "completedAt";

-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "sizePricing" JSONB;
