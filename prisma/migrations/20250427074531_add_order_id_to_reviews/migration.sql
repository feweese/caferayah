/*
  Warnings:

  - You are about to drop the `ContactMessage` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `orderId` to the `Review` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Review" ADD COLUMN     "orderId" TEXT NOT NULL,
ADD COLUMN     "rejectionReason" TEXT;

-- DropTable
DROP TABLE "ContactMessage";

-- DropEnum
DROP TYPE "MessageStatus";

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;
