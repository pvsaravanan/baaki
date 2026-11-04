-- AlterTable
ALTER TABLE "ExpenseShare" ADD COLUMN "settlementTransactionId" TEXT;

-- CreateIndex
CREATE INDEX "ExpenseShare_settlementTransactionId_idx" ON "ExpenseShare"("settlementTransactionId");

-- AddForeignKey
ALTER TABLE "ExpenseShare" ADD CONSTRAINT "ExpenseShare_settlementTransactionId_fkey" FOREIGN KEY ("settlementTransactionId") REFERENCES "Transaction"("id") ON DELETE SET NULL ON UPDATE CASCADE;
