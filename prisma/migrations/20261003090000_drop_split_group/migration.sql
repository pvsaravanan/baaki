-- DropIndex
DROP INDEX "Transaction_splitGroupId_idx";

-- AlterTable
ALTER TABLE "Transaction" DROP COLUMN "splitGroupId";
